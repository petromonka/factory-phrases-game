import { readdirSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

it("uses the repository subpath in GitHub Actions", () => {
  const source = readFileSync("vite.config.ts", "utf8");

  expect(source).toContain('"/factory-phrases-game/"');
  expect(source).toContain("GITHUB_ACTIONS");
});

function buildJavaScript(script: "build" | "build:browser-test"): string {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(`${npm} run ${script}`, {
    encoding: "utf8",
    shell: true
  });

  expect(result.status, result.stderr || result.stdout).toBe(0);
  return readdirSync("dist/assets")
    .filter((file) => file.endsWith(".js"))
    .map((file) => readFileSync(`dist/assets/${file}`, "utf8"))
    .join("\n");
}

it("exposes the player position hook only in the browser-test build", () => {
  expect(buildJavaScript("build")).not.toContain("__factoryTestPositionPlayer");
  expect(buildJavaScript("build:browser-test")).toContain("__factoryTestPositionPlayer");
}, 30_000);
