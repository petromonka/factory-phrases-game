import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("identifies the game document as Ukrainian", () => {
  const parsed = new DOMParser().parseFromString(readFileSync("index.html", "utf8"), "text/html");

  expect(parsed.documentElement.lang).toBe("uk");
});
