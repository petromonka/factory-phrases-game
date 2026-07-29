import { expect, test, type Page } from "@playwright/test";

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

  const status = page.getByRole("status");
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

  const status = page.getByRole("status");
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
