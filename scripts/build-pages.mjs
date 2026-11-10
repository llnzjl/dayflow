import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const stage = mkdtempSync(join(root, ".pages-build-"));
const output = join(root, "out");
const repository = (process.env.GITHUB_REPOSITORY || "llnzjl/dayflow").split("/")[1];
const basePath = process.env.PAGES_BASE_PATH ?? (repository.endsWith(".github.io") ? "" : `/${repository}`);
if (basePath && !/^\/[a-zA-Z0-9._-]+$/.test(basePath)) throw new Error("PAGES_BASE_PATH must be empty or /repository-name");

try {
  // Build in an isolated directory: API routes and admin require a Node server.
  cpSync(join(root, "src"), join(stage, "src"), { recursive: true, filter: (source) => {
    const name = relative(join(root, "src"), source).split(sep).join("/");
    return name !== "app/api" && name !== "app/admin";
  } });
  for (const name of ["package.json", "next.config.mjs", "next-env.d.ts", "tsconfig.json", "tailwind.config.ts", "postcss.config.mjs"]) {
    cpSync(join(root, name), join(stage, name));
  }
  if (existsSync(join(root, "public"))) cpSync(join(root, "public"), join(stage, "public"), { recursive: true });
  const result = spawnSync(process.execPath, [join(root, "node_modules/next/dist/bin/next"), "build"], {
    cwd: stage, stdio: "inherit", env: { ...process.env, NEXT_PUBLIC_PAGES_PREVIEW: "true", PAGES_BASE_PATH: basePath },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Pages build failed (${result.status})`);
  const html = readFileSync(join(stage, "out/index.html"), "utf8");
  if (!html.includes(`${basePath}/_next/`)) throw new Error("Export is missing correctly prefixed assets");
  // Both deletion targets are absolute, generated paths directly inside this repo.
  if (dirname(output) !== root || dirname(stage) !== root) throw new Error("Invalid build directory");
  rmSync(output, { recursive: true, force: true });
  cpSync(join(stage, "out"), output, { recursive: true });
  writeFileSync(join(output, ".nojekyll"), "");
  console.log(`GitHub Pages site ready in out/ (base path: ${basePath || "/"})`);
} finally {
  if (dirname(stage) === root && stage.startsWith(join(root, ".pages-build-"))) rmSync(stage, { recursive: true, force: true });
}
