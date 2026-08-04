# Factory Phrases Game

A small browser exploration game set in a sewing factory. Walk through the checkpoint, offices, sewing lines, and parking level; talk to characters with deliberate `E` interaction.

## Requirements

- Node.js 24 or newer
- npm, included with Node.js

## Run Locally

```bash
npm install
npm run dev
```

Open the local address printed by Vite in a browser.

## Controls And Objective

- Move with `W`, `A`, `S`, and `D`, or the arrow keys.
- Press `E` near a character to start dialogue.
- Press `E` again to advance one dialogue line at a time.
- On a phone, keep it vertical. The game stays above a reserved bottom control area: the lower-left joystick moves the character, and the lower-right action button changes between `Говорити`, `Далі`, and `Парковка` depending on what you can do.

The first level unlocks the parking exit after all five main factory conversations and at least one sewing-line controller request. Progress is kept only for the current page session, so each reload starts again from the KPP.

## Edit Game Content

Character names, rooms, dialogue, and their map object IDs live in [`src/game/characters.ts`](src/game/characters.ts). Sewing-line controller names and random equipment requests live in [`src/game/controllers.ts`](src/game/controllers.ts).

The factory map is [`public/assets/maps/factory.json`](public/assets/maps/factory.json). The parking map is [`public/assets/maps/parking.json`](public/assets/maps/parking.json). Both are Tiled JSON maps and use the tilesheet at [`public/assets/tiles/factory-tiles.png`](public/assets/tiles/factory-tiles.png).

## Production Build And Preview

```bash
npm run build
npm run preview
```

`npm run preview` serves the generated `dist/` directory.

## GitHub Pages And Phone Play

Build for Pages with:

```bash
npm run build:pages
```

Deploy the generated `dist/` files with the `/factory-phrases-game/` base path. On a phone, open the same GitHub Pages URL vertically; movement uses the lower-left joystick and interaction uses the lower-right action button in the reserved control area.

## Browser Smoke Test

Install Playwright browsers once, then run:

```bash
npx playwright install firefox chromium
npm run test:browser
```

The smoke test builds with the GitHub Pages base path, starts Vite preview at `/factory-phrases-game/`, fails on browser page errors, and covers factory dialogue, mobile controls, parking, and restart.

## Deploy To GitHub Pages

The included workflow tests and builds the project on pushes to `main`, then deploys the generated `dist/` artifact. Before the first deployment, enable it in the repository: Settings → Pages → Build and deployment → select GitHub Actions as the source. You can also start the workflow manually from the Actions tab.
