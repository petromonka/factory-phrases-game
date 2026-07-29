import { expect, test } from "@playwright/test";

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
