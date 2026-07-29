import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? "/factory-phrases-game/" : "/",
  resolve: {
    alias: {
      phaser: "phaser/dist/phaser.js"
    }
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/*.test.ts"]
  }
});
