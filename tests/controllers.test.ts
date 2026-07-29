import { expect, it, vi } from "vitest";
import { CONTROLLERS, CONTROLLER_REQUESTS } from "../src/game/controllers";
import { AmbientDialogueState, selectControllerRequest } from "../src/game/controllerDialogue";

it("defines four non-collectible final-control characters", () => {
  expect(CONTROLLERS).toEqual([
    { id: "controller-1", name: "Контролер 1", objectId: "controller-1" },
    { id: "controller-2", name: "Контролер 2", objectId: "controller-2" },
    { id: "controller-3", name: "Контролер 3", objectId: "controller-3" },
    { id: "controller-4", name: "Контролер 4", objectId: "controller-4" }
  ]);
});

it.each([
  [0, "Дайте, будь ласка, нову мишку"],
  [0.25, "Потрібен новий сканер"],
  [0.5, "Потрібен новий комп’ютер"],
  [0.999, "Дайте, будь ласка, новий сенсорний екран"]
])("maps random value %s to the expected request", (value, expected) => {
  expect(selectControllerRequest(() => value)).toBe(expected);
});

it.each([
  [Number.NaN, CONTROLLER_REQUESTS[0]],
  [Number.POSITIVE_INFINITY, CONTROLLER_REQUESTS[0]],
  [-0.1, CONTROLLER_REQUESTS[0]],
  [1, CONTROLLER_REQUESTS[3]]
])("clamps unsafe random value %s to a valid request", (value, expected) => {
  expect(selectControllerRequest(() => value)).toBe(expected);
});

it("selects once per entry and selects again after leaving", () => {
  const random = vi.fn().mockReturnValueOnce(0).mockReturnValueOnce(0.5);
  const state = new AmbientDialogueState(random);

  expect(state.enter("controller-1")?.request).toBe(CONTROLLER_REQUESTS[0]);
  expect(state.enter("controller-1")?.request).toBe(CONTROLLER_REQUESTS[0]);
  expect(random).toHaveBeenCalledTimes(1);
  state.leave();
  expect(state.enter("controller-1")?.request).toBe(CONTROLLER_REQUESTS[2]);
  expect(random).toHaveBeenCalledTimes(2);
});

it("returns an immutable active dialogue snapshot", () => {
  const state = new AmbientDialogueState(() => 0);
  const active = state.enter("controller-1");

  expect(active).toEqual({ id: "controller-1", request: CONTROLLER_REQUESTS[0] });
  expect(Object.isFrozen(active)).toBe(true);
  expect(state.active()).toEqual({ id: "controller-1", request: CONTROLLER_REQUESTS[0] });
  expect(state.active()).not.toBe(active);
});
