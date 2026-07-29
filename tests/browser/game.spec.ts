import { expect, test } from "@playwright/test";

test("boots the Pages build and opens one real dialogue from keyboard input", async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));

  await page.goto("/factory-phrases-game/");

  await expect(page.locator("#game canvas")).toBeVisible();
  const status = page.getByRole("status");
  await expect(status).toHaveAttribute("data-game-state", "ready");

  await page.keyboard.down("w");
  await page.waitForTimeout(1_450);
  await page.keyboard.up("w");
  await page.keyboard.down("a");
  await page.waitForTimeout(350);
  await page.keyboard.up("a");
  await page.keyboard.down("w");
  await page.waitForTimeout(700);
  await page.keyboard.up("w");
  await page.keyboard.down("e");
  await page.waitForTimeout(100);
  await page.keyboard.up("e");

  await expect(status).toHaveAttribute("data-game-state", "dialogue");
  await expect(status).toHaveAttribute("data-character-id", "security-serhii");
  await expect(status).toContainText("Охоронець Сергій");
  await expect(status).toContainText("Він мені одразу не понравився");
  expect(pageErrors).toEqual([]);
});
