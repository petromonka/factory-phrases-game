import { expect, it } from "vitest";
import { discover, isComplete, parseProgress, ProgressStore } from "../src/game/progress";

it("counts each character only once", () => {
  const once = discover(new Set(), "security-serhii");
  expect(discover(once, "security-serhii").size).toBe(1);
});

it("rejects malformed stored progress", () => {
  expect([...parseProgress("{broken")]).toEqual([]);
});

it("ignores unknown ids in stored progress", () => {
  expect([...parseProgress('["security-serhii", "unknown"]')]).toEqual(["security-serhii"]);
});

it("completes after all five known ids", () => {
  const ids = ["security-serhii", "it-vasyl", "shifts-serhii", "qm-olena", "sewing-sasha"];
  expect(isComplete(new Set(ids))).toBe(true);
});

it("keeps progress in memory when storage is unavailable", () => {
  const store = new ProgressStore(undefined);

  store.save(new Set(["security-serhii"]));

  expect([...store.load()]).toEqual(["security-serhii"]);
});
