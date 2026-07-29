# Factory Phrases Game

A small desktop-browser exploration game set in a factory office. Walk through the connected rooms, speak to the five characters, and discover all five phrases.

## Requirements

- Node.js 24 or newer
- npm (included with Node.js)

## Run locally

Install the dependencies and start Vite's development server:

```bash
npm install
npm run dev
```

Open the local address printed by Vite in a desktop browser.

## Controls and objective

- Move with `W`, `A`, `S`, and `D`, or the arrow keys.
- Stand close to a character and press `E` to talk.
- Close an open dialogue with `E`, `Space`, or a pointer click.

The objective is to find every phrase from the five characters in the connected office rooms. Progress is saved in the browser, so returning to the game preserves phrases already found.

## Edit game content

Character names, rooms, phrases, and their map object IDs live in [`src/game/characters.ts`](src/game/characters.ts). Keep each `objectId` aligned with the matching point object in the map's `npcs` object layer.

The map is a Tiled JSON map at [`public/assets/maps/factory.json`](public/assets/maps/factory.json). Open it in [Tiled](https://www.mapeditor.org/), edit the visible tile layers or object layers, and save it back in JSON format. Preserve the required `floor`, `walls`, and `furniture` tile layers, plus the `collisions`, `spawn`, and `npcs` object layers; the game expects a `player-spawn` point and one NPC point for every character.

## Production build and preview

Create and inspect the production build locally:

```bash
npm run build
npm run preview
```

`npm run preview` serves the generated `dist/` directory. The build automatically uses `/factory-phrases-game/` as its asset base path in GitHub Actions and `/` during local development.

## Browser smoke test

Install Playwright's Firefox browser once, then run the production-preview smoke in installed Chrome and Playwright Firefox:

```bash
npx playwright install firefox
npm run test:browser
```

The smoke builds with the GitHub Pages base path, starts Vite's production preview at `/factory-phrases-game/`, fails on browser page errors, and opens one real NPC dialogue with keyboard input.

## Deploy to GitHub Pages

The included workflow tests and builds the project on pushes to `main`, then deploys the generated `dist/` artifact. Before the first deployment, enable it in the repository: **Settings** → **Pages** → **Build and deployment** → select **GitHub Actions** as the source. You can also start the workflow manually from the Actions tab.
