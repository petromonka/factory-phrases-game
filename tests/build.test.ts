import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("uses the repository subpath in GitHub Actions", () => {
  const source = readFileSync("vite.config.ts", "utf8");

  expect(source).toContain('"/factory-phrases-game/"');
  expect(source).toContain("GITHUB_ACTIONS");
});
