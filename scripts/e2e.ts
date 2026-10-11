import path from "node:path";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { MongoMemoryReplSet } from "mongodb-memory-server";
// Never run browser test mutations against the database in the user's .env.
process.env.MONGOMS_DOWNLOAD_DIR = path.resolve(".cache/mongodb");
const database = await MongoMemoryReplSet.create({
  binary: { version: "8.0.17" },
  // Cold WiredTiger startup can exceed the library's 10-second default.
  instanceOpts: [{ launchTimeout: 60_000 }],
  replSet: { count: 1, storageEngine: "wiredTiger" },
});
let child: ReturnType<typeof spawn> | undefined;
try {
  child = spawn(
    process.execPath,
    [
      path.resolve("node_modules/@playwright/test/cli.js"),
      "test",
      ...process.argv.slice(2),
    ],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        MONGODB_URI: database.getUri("saathi_e2e"),
        SESSION_SECRET: randomBytes(48).toString("hex"),
        NODE_ENV: "development",
        HOSTED_DEMO: "false",
        ALLOW_DEMO_SEED: "true",
        DEMO_MODE: "true",
        DEMO_PASSWORD: "SaathiDemo2026!",
        APP_ORIGIN: "http://127.0.0.1:3000",
        API_INTERNAL_URL: "http://127.0.0.1:4000",
        API_PORT: "4000",
        PORT: "3000",
      },
    },
  );
  const stop = () => child?.kill("SIGTERM");
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  process.exitCode = await new Promise<number>((resolve, reject) => {
    child!.once("error", reject);
    child!.once("exit", (code) => resolve(code ?? 1));
  });
  process.removeListener("SIGINT", stop);
  process.removeListener("SIGTERM", stop);
} finally {
  await database.stop();
}
