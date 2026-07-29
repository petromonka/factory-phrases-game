import { expect, test, type Page } from "@playwright/test";
import { PNG } from "pngjs";

const PLAYER_SHIRT = { red: 0x31, green: 0x5c, blue: 0xab };
const PLAYER_COLOR_TOLERANCE = 12;

async function playerScreenPosition(page: Page): Promise<{ x: number; y: number }> {
  const screenshot = PNG.sync.read(await page.locator("canvas").screenshot());
  let count = 0;
  let xTotal = 0;
  let yTotal = 0;

  for (let y = 0; y < screenshot.height; y += 1) {
    for (let x = 0; x < screenshot.width; x += 1) {
      const offset = (y * screenshot.width + x) * 4;
      if (
        Math.abs(screenshot.data[offset] - PLAYER_SHIRT.red) <= PLAYER_COLOR_TOLERANCE &&
        Math.abs(screenshot.data[offset + 1] - PLAYER_SHIRT.green) <= PLAYER_COLOR_TOLERANCE &&
        Math.abs(screenshot.data[offset + 2] - PLAYER_SHIRT.blue) <= PLAYER_COLOR_TOLERANCE &&
        screenshot.data[offset + 3] === 0xff
      ) {
        count += 1;
        xTotal += x;
        yTotal += y;
      }
    }
  }

  if (count === 0) {
    throw new Error("Player shirt pixels are missing from the canvas");
  }

  return { x: xTotal / count, y: yTotal / count };
}

function screenDistance(
  first: { x: number; y: number },
  second: { x: number; y: number }
): number {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

async function positionPlayerNearController(page: Page): Promise<void> {
  await page.waitForFunction(
    () => typeof (window as typeof window & {
      __factoryTestPositionPlayer?: unknown;
    }).__factoryTestPositionPlayer === "function"
  );
  await page.evaluate(() => {
    const positionPlayer = (window as typeof window & {
      __factoryTestPositionPlayer: (x: number, y: number) => void;
    }).__factoryTestPositionPlayer;
    positionPlayer(744, 280);
  });
}

test("opens and closes guard dialogue from proximity without E", async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));
  await page.goto("/factory-phrases-game/");

  const status = page.locator("#game-status");
  await expect(status).toHaveAttribute("data-game-state", "ready");

  await page.keyboard.down("a");
  await page.waitForTimeout(260);
  await page.keyboard.up("a");
  await page.keyboard.down("w");
  await page.waitForTimeout(420);
  await page.keyboard.up("w");

  await expect(status).toHaveAttribute("data-game-state", "dialogue");
  await expect(status).toHaveAttribute("data-character-id", "security-serhii");

  await page.keyboard.down("d");
  await page.waitForTimeout(700);
  await page.keyboard.up("d");
  await expect(status).toHaveAttribute("data-game-state", "ready");
  await expect(status).not.toHaveAttribute("data-character-id");
  expect(pageErrors).toEqual([]);
});

test("opens controller dialogue again after leaving without changing collectible progress", async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));
  await page.addInitScript(() => localStorage.clear());
  await page.goto("/factory-phrases-game/");

  const status = page.locator("#game-status");
  await expect(status).toHaveAttribute("data-game-state", "ready");

  await positionPlayerNearController(page);
  await page.keyboard.down("s");
  try {
    await expect(status).toHaveAttribute("data-game-state", "dialogue", { timeout: 5_000 });
  } finally {
    await page.keyboard.up("s");
  }
  await expect(status).toHaveAttribute("data-character-id", "controller-1");
  await expect(status).toContainText("Контролер 1");
  await expect(page.locator("canvas")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("factory-phrases-progress-v1"))).toBeNull();

  await page.keyboard.down("a");
  try {
    await expect(status).toHaveAttribute("data-game-state", "ready");
  } finally {
    await page.keyboard.up("a");
  }

  await page.keyboard.down("d");
  try {
    await expect(status).toHaveAttribute("data-game-state", "dialogue");
  } finally {
    await page.keyboard.up("d");
  }
  await expect(status).toHaveAttribute("data-character-id", "controller-1");
  expect(await page.evaluate(() => localStorage.getItem("factory-phrases-progress-v1"))).toBeNull();
  expect(pageErrors).toEqual([]);
});

test("moves from the mobile joystick and resets on release", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium");
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));
  await page.goto("/factory-phrases-game/");

  const joystick = page.locator("#touch-joystick");
  const knob = page.locator("#touch-joystick-knob");
  const status = page.locator("#game-status");
  const orientationHint = page.locator("#orientation-hint");

  await expect(joystick).toBeVisible();
  await expect(orientationHint).toBeVisible();
  await expect(orientationHint).toHaveText("Поверніть телефон горизонтально");
  await expect(status).toHaveAttribute("data-game-state", "ready");

  const box = await joystick.boundingBox();
  if (!box) throw new Error("Joystick has no bounding box");
  const center = {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2
  };

  await joystick.dispatchEvent("pointerdown", {
    pointerId: 1,
    pointerType: "touch",
    clientX: center.x,
    clientY: center.y
  });
  await joystick.dispatchEvent("pointermove", {
    pointerId: 1,
    pointerType: "touch",
    clientX: center.x - box.width / 2,
    clientY: center.y
  });
  await expect(knob).not.toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
  await page.waitForTimeout(260);

  await joystick.dispatchEvent("pointermove", {
    pointerId: 1,
    pointerType: "touch",
    clientX: center.x,
    clientY: center.y - box.height / 2
  });
  await page.waitForTimeout(420);
  await expect(status).toHaveAttribute("data-game-state", "dialogue");
  await expect(status).toHaveAttribute("data-character-id", "security-serhii");

  const movingPosition = await playerScreenPosition(page);
  await page.waitForTimeout(50);
  expect(screenDistance(movingPosition, await playerScreenPosition(page))).toBeGreaterThan(1);

  await page.dispatchEvent("body", "pointerup", {
    pointerId: 1,
    pointerType: "touch",
    clientX: center.x,
    clientY: center.y - box.height / 2
  });

  await expect(knob).toHaveAttribute("style", "transform: translate(0px, 0px);");
  await expect(knob).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
  const releasedPosition = await playerScreenPosition(page);
  await page.waitForTimeout(200);
  expect(screenDistance(releasedPosition, await playerScreenPosition(page))).toBeLessThanOrEqual(1);

  await joystick.dispatchEvent("pointerdown", {
    pointerId: 1,
    pointerType: "touch",
    clientX: center.x,
    clientY: center.y
  });
  await joystick.dispatchEvent("pointermove", {
    pointerId: 1,
    pointerType: "touch",
    clientX: center.x + box.width / 2,
    clientY: center.y
  });
  try {
    await expect(status).toHaveAttribute("data-game-state", "ready");
  } finally {
    await page.dispatchEvent("body", "pointerup", {
      pointerId: 1,
      pointerType: "touch",
      clientX: center.x + box.width / 2,
      clientY: center.y
    });
  }
  await expect(knob).toHaveAttribute("style", "transform: translate(0px, 0px);");
  expect(pageErrors).toEqual([]);
});

test("hides the portrait orientation hint in landscape", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium");
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));
  await page.goto("/factory-phrases-game/");

  const orientationHint = page.locator("#orientation-hint");
  await expect(orientationHint).toBeVisible();
  await page.setViewportSize({ width: 915, height: 412 });
  await expect(orientationHint).toBeHidden();
  expect(pageErrors).toEqual([]);
});

test("keeps the mobile joystick hidden on desktop", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile-chromium");
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));
  await page.goto("/factory-phrases-game/");

  await expect(page.locator("#touch-joystick")).toBeHidden();
  expect(pageErrors).toEqual([]);
});
