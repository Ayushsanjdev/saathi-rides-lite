import { createHash, randomBytes } from "node:crypto";
import type { Request, Response, NextFunction, Express } from "express";
import argon2 from "argon2";
import { rateLimit } from "express-rate-limit";
import { loginSchema, registerSchema, type UserDTO } from "@saathi/contracts";
import { User, Driver, MobileSession } from "./models";
import { AppError, parse } from "./errors";

const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const profile = (user: {
  _id: unknown;
  name: string;
  email: string;
  role: UserDTO["role"];
  phone?: string;
}): UserDTO => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
});
async function issue(user: Parameters<typeof profile>[0]) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 86400000);
  await MobileSession.create({
    userId: String(user._id),
    tokenHash: hash(token),
    expiresAt,
  });
  return { user: profile(user), token, expiresAt: expiresAt.toISOString() };
}
// Authentication is resolved before CSRF. A submitted but invalid header never
// falls back to ambient browser cookies, nor grants a CSRF exemption.
export async function mobileCredentials(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const header = req.get("Authorization");
  if (header === undefined) return next();
  if (!/^Bearer [a-f0-9]{64}$/.test(header))
    throw new AppError(401, "UNAUTHENTICATED", "Your session has expired.");
  const session = await MobileSession.findOne({
    tokenHash: hash(header.slice(7)),
    expiresAt: { $gt: new Date() },
  }).lean();
  if (!session)
    throw new AppError(401, "UNAUTHENTICATED", "Your session has expired.");
  const user = await User.findOne({ _id: session.userId, active: true }).lean();
  if (!user)
    throw new AppError(401, "UNAUTHENTICATED", "Your session has expired.");
  if (user.role === "operator")
    throw new AppError(
      403,
      "FORBIDDEN",
      "Use the web app for operator administration.",
    );
  if (
    user.role === "driver" &&
    !(await Driver.exists({ userId: String(user._id), active: true }))
  )
    throw new AppError(
      403,
      "ACCOUNT_INACTIVE",
      "Your driver account is inactive. Contact the operator.",
    );
  res.locals.mobileSessionId = session._id;
  res.locals.user = profile(user);
  next();
}
export function mobileAuthRoutes(app: Express) {
  const limit = rateLimit({
    windowMs: 15 * 60000,
    limit: 100,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      error: {
        code: "RATE_LIMITED",
        message: "Too many attempts. Try again later.",
      },
    },
  });
  app.post("/api/mobile/auth/login", limit, async (req, res) => {
    const input = parse(loginSchema, req.body);
    const user = await User.findOne({
      email: input.email,
      active: true,
    }).select("+passwordHash");
    if (!user || !(await argon2.verify(user.passwordHash, input.password)))
      throw new AppError(
        401,
        "INVALID_CREDENTIALS",
        "Email or password is incorrect.",
      );
    if (user.role === "operator")
      throw new AppError(
        403,
        "FORBIDDEN",
        "Use the web app for operator administration.",
      );
    if (
      user.role === "driver" &&
      !(await Driver.exists({ userId: String(user._id), active: true }))
    )
      throw new AppError(
        403,
        "ACCOUNT_INACTIVE",
        "Your driver account is inactive. Contact the operator.",
      );
    res.set("Cache-Control", "no-store").json(await issue(user));
  });
  app.post("/api/mobile/auth/register", limit, async (req, res) => {
    const input = parse(registerSchema, req.body);
    const passwordHash = await argon2.hash(input.password, {
      type: argon2.argon2id,
    });
    const user = await User.create({
      name: input.name,
      email: input.email,
      phone: input.phone,
      passwordHash,
      role: "passenger",
      active: true,
    });
    res
      .status(201)
      .set("Cache-Control", "no-store")
      .json(await issue(user));
  });
  app.post("/api/mobile/auth/logout", async (_req, res) => {
    if (!res.locals.mobileSessionId)
      throw new AppError(401, "UNAUTHENTICATED", "Sign in to continue.");
    await MobileSession.deleteOne({ _id: res.locals.mobileSessionId });
    res.json({ ok: true });
  });
}
