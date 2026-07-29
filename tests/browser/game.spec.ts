import { expect, test, type Page } from "@playwright/test";

type MovementKey = "a" | "d" | "s" | "w";

const movementKeyData: Record<MovementKey, { code: string; keyCode: number }> = {
  a: { code: "KeyA", keyCode: 65 },
  d: { code: "KeyD", keyCode: 68 },
  s: { code: "KeyS", keyCode: 83 },
  w: { code: "KeyW", keyCode: 87 }
};

let releaseSequence = 0;

async function pressForBrowserTime(page: Page, key: MovementKey, duration: number): Promise<void> {
  const releaseToken = `${key}-${releaseSequence++}`;
  const { code, keyCode } = movementKeyData[key];

  await page.evaluate(
    ({ code, duration, key, keyCode, releaseToken }) => {
      const releaseOnKeyDown = (event: KeyboardEvent): void => {
        if (event.code !== code) {
          return;
        }

        window.removeEventListener("keydown", releaseOnKeyDown);
        window.setTimeout(() => {
          window.dispatchEvent(new KeyboardEvent("keyup", {
            bubbles: true,
            cancelable: true,
            code,
            key,
            keyCode,
            which: keyCode
          }));
          document.documentElement.dataset.testKeyRelease = releaseToken;
        }, duration);
      };

      window.addEventListener("keydown", releaseOnKeyDown);
    },
    { code, duration, key, keyCode, releaseToken }
  );

  await page.keyboard.down(key);
  try {
    await page.waitForFunction(
      (token) => document.documentElement.dataset.testKeyRelease === token,
      releaseToken,
      { timeout: duration + 2_000 }
    );
  } finally {
    await page.keyboard.up(key);
  }
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

  await pressForBrowserTime(page, "d", 700);
  await pressForBrowserTime(page, "w", 1_200);
  await pressForBrowserTime(page, "a", 520);
  await pressForBrowserTime(page, "w", 300);
  await pressForBrowserTime(page, "d", 5_200);
  await pressForBrowserTime(page, "a", 1_220);
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
