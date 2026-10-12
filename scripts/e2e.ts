import path from "node:path";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { MongoMemoryReplSet } from "mongodb-memory-server";
const webPort = process.env.SAATHI_E2E_PORT || "3100";
const apiPort = process.env.SAATHI_E2E_API_PORT || "4100";
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
        APP_ORIGIN: `http://127.0.0.1:${webPort}`,
        API_INTERNAL_URL: `http://127.0.0.1:${apiPort}`,
        API_PORT: apiPort,
        PORT: webPort,
        SAATHI_NEXT_DIST_DIR: '.next-e2e',
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
