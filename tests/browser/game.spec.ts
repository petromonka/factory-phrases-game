import { expect, test, type Page } from "@playwright/test";
import { PNG } from "pngjs";

const PLAYER_SHIRT = { red: 0x31, green: 0x5c, blue: 0xab };
const PLAYER_COLOR_TOLERANCE = 12;

type FactoryTestWindow = Window & {
  __factoryTestPositionPlayer?: (x: number, y: number) => void;
  __factoryTestUnlockParking?: () => void;
  __factoryTestPositionParkingPlayer?: (x: number, y: number) => void;
};

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

async function waitForFactoryHook(page: Page): Promise<void> {
  await page.waitForFunction(
    () => typeof (window as FactoryTestWindow).__factoryTestPositionPlayer === "function"
  );
}

async function positionFactoryPlayer(page: Page, x: number, y: number): Promise<void> {
  await waitForFactoryHook(page);
  await page.evaluate(([nextX, nextY]) => {
    (window as FactoryTestWindow).__factoryTestPositionPlayer?.(nextX, nextY);
  }, [x, y]);
}

async function positionParkingPlayer(page: Page, x: number, y: number): Promise<void> {
  await page.waitForFunction(
    () => typeof (window as FactoryTestWindow).__factoryTestPositionParkingPlayer === "function"
  );
  await page.evaluate(([nextX, nextY]) => {
    (window as FactoryTestWindow).__factoryTestPositionParkingPlayer?.(nextX, nextY);
  }, [x, y]);
}

async function pressInteractionKey(page: Page): Promise<void> {
  await page.keyboard.down("e");
  await page.waitForTimeout(80);
  await page.keyboard.up("e");
}

test("opens guard dialogue only from E and advances one line per press", async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));
  await page.goto("/factory-phrases-game/");

  const status = page.locator("#game-status");
  await expect(status).toHaveAttribute("data-game-state", "ready");

  await positionFactoryPlayer(page, 88, 392);
  await expect(status).toHaveAttribute("data-game-state", "prompt");
  await expect(status).toContainText("Натисни E, щоб говорити");

  await pressInteractionKey(page);
  await expect(status).toHaveAttribute("data-game-state", "dialogue");
  await expect(status).toContainText("Привіт, Сєрий");
  await expect(status).not.toContainText("Я:");
  await pressInteractionKey(page);
  await expect(status).toContainText("Здоров");
  await pressInteractionKey(page);
  await expect(status).toContainText("Як там справи? Що скажеш на Пашу?");
  await pressInteractionKey(page);
  await expect(status).toContainText("Він мені одразу не понравився, як я тільки його побачив");
  await pressInteractionKey(page);
  await expect(status).toHaveAttribute("data-game-state", "dialogue");
  await pressInteractionKey(page);
  await expect(status).toHaveAttribute("data-game-state", "prompt");
  expect(pageErrors).toEqual([]);
});

test("opens controller dialogue by E without changing collectible progress or localStorage", async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));
  await page.addInitScript(() => localStorage.clear());
  await page.goto("/factory-phrases-game/");

  const status = page.locator("#game-status");
  await expect(status).toHaveAttribute("data-game-state", "ready");

  await positionFactoryPlayer(page, 744, 344);
  await expect(status).toHaveAttribute("data-game-state", "prompt");
  await pressInteractionKey(page);
  await expect(status).toHaveAttribute("data-game-state", "dialogue");
  await expect(status).toContainText("Контролер Галина");
  await expect(page.locator("canvas")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("factory-phrases-progress-v1"))).toBeNull();
  await pressInteractionKey(page);
  await expect(status).toContainText("Фрази: 0/5");
  expect(pageErrors).toEqual([]);
});

test("plays parking level and restarts from Yura", async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));
  await page.goto("/factory-phrases-game/");

  const status = page.locator("#game-status");
  await expect(status).toHaveAttribute("data-game-state", "ready");
  await waitForFactoryHook(page);
  await page.evaluate(() => (window as FactoryTestWindow).__factoryTestUnlockParking?.());
  await positionFactoryPlayer(page, 920, 488);
  await expect(status).toHaveAttribute("data-game-state", "exit-prompt");
  await expect(status).toContainText("Натисни E, щоб вийти на парковку");
  await pressInteractionKey(page);
  await expect(status).toHaveAttribute("data-scene", "parking");

  await positionParkingPlayer(page, 304, 336);
  await expect(status).toHaveAttribute("data-game-state", "prompt");
  await pressInteractionKey(page);
  await expect(status).toContainText("Не міган канєшно, але піде");
  await pressInteractionKey(page);
  await expect(status).toHaveAttribute("data-dimon-departed", "true", { timeout: 3_000 });

  await positionParkingPlayer(page, 792, 184);
  await expect(status).toHaveAttribute("data-game-state", "prompt");
  await pressInteractionKey(page);
  await expect(status).toContainText("Щось в мене цееееейво");
  await pressInteractionKey(page);
  await expect(status).toContainText("Зараз будем сі дивили.");
  await pressInteractionKey(page);
  await expect(status).toContainText("Щееее ееее катридж маєте ?");
  await pressInteractionKey(page);
  await expect(status).toContainText("Глянемо Юр.");
  await pressInteractionKey(page);
  await expect(status).toHaveAttribute("data-scene", "factory");
  await expect(status).toContainText("Фрази: 0/5");
  expect(pageErrors).toEqual([]);
});

test("moves from the mobile joystick and interacts with the mobile E button", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium");
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));
  await page.goto("/factory-phrases-game/");

  const joystick = page.locator("#touch-joystick");
  const knob = page.locator("#touch-joystick-knob");
  const interaction = page.locator("#touch-interaction");
  const status = page.locator("#game-status");
  const orientationHint = page.locator("#orientation-hint");

  await expect(joystick).toBeVisible();
  await expect(interaction).toBeVisible();
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
  const movingPosition = await playerScreenPosition(page);
  await page.waitForTimeout(50);
  expect(screenDistance(movingPosition, await playerScreenPosition(page))).toBeGreaterThan(1);
  await page.dispatchEvent("body", "pointerup", {
    pointerId: 1,
    pointerType: "touch",
    clientX: center.x - box.width / 2,
    clientY: center.y
  });
  await expect(knob).toHaveAttribute("style", "transform: translate(0px, 0px);");

  await positionFactoryPlayer(page, 88, 392);
  await expect(status).toHaveAttribute("data-game-state", "prompt");
  const interactionBox = await interaction.boundingBox();
  if (!interactionBox) throw new Error("Interaction button has no bounding box");
  await interaction.dispatchEvent("pointerdown", {
    pointerId: 2,
    pointerType: "touch",
    clientX: interactionBox.x + interactionBox.width / 2,
    clientY: interactionBox.y + interactionBox.height / 2
  });
  await page.dispatchEvent("body", "pointerup", {
    pointerId: 2,
    pointerType: "touch",
    clientX: interactionBox.x + interactionBox.width / 2,
    clientY: interactionBox.y + interactionBox.height / 2
  });
  await expect(status).toHaveAttribute("data-game-state", "dialogue");
  await expect(status).toContainText("Привіт, Сєрий");
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

test("keeps mobile controls hidden on desktop", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile-chromium");
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));
  await page.goto("/factory-phrases-game/");

  await expect(page.locator("#touch-joystick")).toBeHidden();
  await expect(page.locator("#touch-interaction")).toBeHidden();
  expect(pageErrors).toEqual([]);
});
