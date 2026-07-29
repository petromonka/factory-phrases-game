import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { PNG } from "pngjs";

const root = resolve(import.meta.dirname, "..");
const tileSize = 16;
const mapWidth = 60;
const mapHeight = 34;
const tilesPath = resolve(root, "public/assets/tiles/factory-tiles.png");
const mapPath = resolve(root, "public/assets/maps/factory.json");
const palette = {
  concrete: [184, 194, 190],
  concreteShade: [151, 165, 162],
  wall: [48, 62, 75],
  wallLight: [87, 108, 123],
  doorway: [222, 176, 72],
  wood: [129, 83, 52],
  screen: [75, 207, 192],
  cabinet: [121, 139, 152],
  box: [174, 121, 61],
  thread: [208, 79, 109],
  machine: [94, 116, 144],
  ink: [27, 37, 48]
};

function paint(png, x, y, color) {
  const index = (y * png.width + x) * 4;
  png.data[index] = color[0];
  png.data[index + 1] = color[1];
  png.data[index + 2] = color[2];
  png.data[index + 3] = 255;
}

function fill(png, tile, color) {
  const startX = (tile % 4) * tileSize;
  const startY = Math.floor(tile / 4) * tileSize;
  for (let y = startY; y < startY + tileSize; y += 1) {
    for (let x = startX; x < startX + tileSize; x += 1) paint(png, x, y, color);
  }
}

function rect(png, tile, x, y, width, height, color) {
  const startX = (tile % 4) * tileSize + x;
  const startY = Math.floor(tile / 4) * tileSize + y;
  for (let py = startY; py < startY + height; py += 1) {
    for (let px = startX; px < startX + width; px += 1) paint(png, px, py, color);
  }
}

function generateTiles() {
  const png = new PNG({ width: 64, height: 64, colorType: 6 });
  for (let tile = 0; tile < 16; tile += 1) fill(png, tile, palette.concrete);

  for (let y = 0; y < tileSize; y += 4) {
    for (let x = (y / 4) % 2 === 0 ? 0 : 2; x < tileSize; x += 4) rect(png, 1, x, y, 2, 2, palette.concreteShade);
  }
  rect(png, 2, 0, 0, 16, 16, palette.wall);
  rect(png, 2, 1, 1, 14, 2, palette.wallLight);
  rect(png, 2, 1, 13, 14, 2, palette.ink);
  rect(png, 3, 0, 0, 16, 16, palette.wallLight);
  rect(png, 3, 2, 2, 12, 12, palette.wall);
  rect(png, 4, 0, 0, 16, 16, palette.doorway);
  rect(png, 4, 2, 0, 2, 16, palette.wood);
  rect(png, 4, 12, 0, 2, 16, palette.wood);
  rect(png, 5, 1, 3, 14, 10, palette.wood);
  rect(png, 5, 1, 3, 14, 2, palette.ink);
  rect(png, 5, 2, 13, 2, 3, palette.ink);
  rect(png, 5, 12, 13, 2, 3, palette.ink);
  rect(png, 6, 3, 2, 10, 9, palette.ink);
  rect(png, 6, 4, 3, 8, 6, palette.screen);
  rect(png, 6, 2, 12, 12, 2, palette.wood);
  rect(png, 7, 2, 1, 12, 14, palette.cabinet);
  rect(png, 7, 3, 3, 10, 1, palette.wallLight);
  rect(png, 7, 3, 8, 10, 1, palette.wallLight);
  rect(png, 8, 1, 4, 14, 10, palette.box);
  rect(png, 8, 2, 5, 12, 1, palette.wood);
  rect(png, 9, 3, 3, 10, 10, palette.thread);
  rect(png, 9, 5, 5, 6, 6, palette.concrete);
  rect(png, 10, 1, 2, 14, 12, palette.machine);
  rect(png, 10, 3, 4, 10, 5, palette.wallLight);
  rect(png, 10, 5, 10, 6, 2, palette.ink);
  rect(png, 11, 2, 2, 12, 12, palette.wallLight);
  rect(png, 11, 4, 4, 8, 8, palette.ink);
  rect(png, 12, 2, 2, 12, 12, palette.concreteShade);
  rect(png, 13, 2, 2, 12, 12, palette.wallLight);
  rect(png, 14, 2, 2, 12, 12, palette.box);
  rect(png, 15, 2, 2, 12, 12, palette.machine);

  mkdirSync(dirname(tilesPath), { recursive: true });
  writeFileSync(tilesPath, PNG.sync.write(png));
}

function createFactoryMap() {
  const floor = Array(mapWidth * mapHeight).fill(1);
  const walls = Array(mapWidth * mapHeight).fill(0);
  const furniture = Array(mapWidth * mapHeight).fill(0);
  const collisions = [];
  let objectId = 1;
  const cell = (x, y) => y * mapWidth + x;
  const set = (data, x, y, value) => {
    if (x >= 0 && x < mapWidth && y >= 0 && y < mapHeight) data[cell(x, y)] = value;
  };
  const collision = (name, x, y, width, height) => collisions.push({ id: objectId++, name, type: "solid", x, y, width, height, rotation: 0, visible: true });
  const stamp = (data, x, y, width, height, value) => {
    for (let row = y; row < y + height; row += 1) {
      for (let column = x; column < x + width; column += 1) set(data, column, row, value);
    }
  };
  const addHorizontalWall = (name, x, y, width) => {
    if (width <= 0) return;
    stamp(walls, x, y, width, 1, 3);
    collision(name, x * tileSize, y * tileSize, width * tileSize, tileSize);
  };
  const addVerticalWall = (name, x, y, height) => {
    stamp(walls, x, y, 1, height, 3);
    collision(name, x * tileSize, y * tileSize, tileSize, height * tileSize);
  };
  const drawUpperOffice = (name, x, y, width, height, doorX) => {
    addHorizontalWall(`${name}-top`, x, y, width);
    addVerticalWall(`${name}-left`, x, y, height);
    addVerticalWall(`${name}-right`, x + width - 1, y, height);
    addHorizontalWall(`${name}-bottom-left`, x, y + height - 1, doorX - x);
    addHorizontalWall(`${name}-bottom-right`, doorX + 2, y + height - 1, x + width - (doorX + 2));
    set(walls, doorX, y + height - 1, 5);
    set(walls, doorX + 1, y + height - 1, 5);
  };
  const drawEntry = () => {
    const x = 2;
    const y = 18;
    const width = 14;
    const height = 14;
    const doorX = 8;
    addHorizontalWall("entry-top-left", x, y, doorX - x);
    addHorizontalWall("entry-top-right", doorX + 2, y, x + width - (doorX + 2));
    addHorizontalWall("entry-bottom", x, y + height - 1, width);
    addVerticalWall("entry-left", x, y, height);
    addVerticalWall("entry-right", x + width - 1, y, height);
    set(walls, doorX, y, 5);
    set(walls, doorX + 1, y, 5);
  };
  const addFurniture = (name, x, y, width, height, tile) => {
    stamp(furniture, x, y, width, height, tile);
    collision(name, x * tileSize, y * tileSize, width * tileSize, height * tileSize);
  };

  for (let row = 16; row < 33; row += 1) {
    for (let column = 17; column < 58; column += 1) if ((column + row) % 4 === 0) set(floor, column, row, 2);
  }
  addHorizontalWall("outer-top", 0, 0, mapWidth);
  addHorizontalWall("outer-bottom", 0, mapHeight - 1, mapWidth);
  addVerticalWall("outer-left", 0, 0, mapHeight);
  addVerticalWall("outer-right", mapWidth - 1, 0, mapHeight);
  drawUpperOffice("gatehouse", 2, 2, 7, 11, 4);
  drawUpperOffice("it", 10, 2, 7, 11, 12);
  drawUpperOffice("shifts", 18, 2, 9, 11, 21);
  drawUpperOffice("qm", 29, 2, 9, 11, 32);
  drawUpperOffice("sewing", 40, 2, 11, 11, 44);
  drawEntry();
  addFurniture("gatehouse-desk", 3, 4, 2, 1, 6);
  addFurniture("gatehouse-cabinet", 6, 3, 1, 2, 8);
  addFurniture("it-desk", 11, 4, 2, 1, 6);
  addFurniture("it-cabinet", 14, 3, 1, 3, 8);
  addFurniture("shifts-desk", 19, 4, 2, 1, 6);
  addFurniture("shifts-boxes", 24, 3, 1, 2, 9);
  addFurniture("qm-desk", 30, 4, 2, 1, 6);
  addFurniture("qm-cabinet", 36, 3, 1, 3, 8);
  addFurniture("sewing-thread", 41, 3, 2, 1, 10);
  addFurniture("sewing-boxes", 48, 4, 1, 2, 9);
  addFurniture("entry-desk", 3, 21, 2, 1, 6);
  addFurniture("entry-cabinet", 13, 20, 1, 3, 8);
  addFurniture("production-machine-a", 20, 20, 3, 2, 11);
  addFurniture("production-machine-b", 28, 20, 3, 2, 11);
  addFurniture("production-machine-c", 36, 20, 3, 2, 11);
  addFurniture("production-machine-d", 44, 20, 3, 2, 11);
  addFurniture("production-machine-e", 24, 26, 3, 2, 11);
  addFurniture("production-machine-f", 34, 26, 3, 2, 11);
  addFurniture("production-supplies", 48, 27, 2, 2, 9);

  const point = (name, x, y, type) => ({ id: objectId++, name, type, x, y, width: 0, height: 0, rotation: 0, visible: true, point: true });
  const spawn = [point("player-spawn", 136, 472, "spawn")];
  const npcs = [
    point("npc-security", 88, 120, "npc"),
    point("npc-it", 216, 120, "npc"),
    point("npc-shifts", 360, 120, "npc"),
    point("npc-qm", 536, 120, "npc"),
    point("npc-sewing", 728, 120, "npc")
  ];
  const tileLayer = (id, name, data) => ({ id, name, type: "tilelayer", x: 0, y: 0, width: mapWidth, height: mapHeight, opacity: 1, visible: true, data });
  const objectLayer = (id, name, objects) => ({ id, name, type: "objectgroup", x: 0, y: 0, opacity: 1, visible: true, draworder: "topdown", objects });
  const map = {
    compressionlevel: -1,
    height: mapHeight,
    infinite: false,
    layers: [
      tileLayer(1, "floor", floor),
      tileLayer(2, "walls", walls),
      tileLayer(3, "furniture", furniture),
      objectLayer(4, "collisions", collisions),
      objectLayer(5, "spawn", spawn),
      objectLayer(6, "npcs", npcs)
    ],
    nextlayerid: 7,
    nextobjectid: objectId,
    orientation: "orthogonal",
    renderorder: "right-down",
    tiledversion: "1.11.0",
    tileheight: tileSize,
    tilesets: [{ columns: 4, firstgid: 1, image: "../tiles/factory-tiles.png", imageheight: 64, imagewidth: 64, margin: 0, name: "factory-tiles", spacing: 0, tilecount: 16, tileheight: tileSize, tilewidth: tileSize }],
    tilewidth: tileSize,
    type: "map",
    version: "1.10",
    width: mapWidth
  };

  mkdirSync(dirname(mapPath), { recursive: true });
  writeFileSync(mapPath, `${JSON.stringify(map, null, 2)}\n`);
}

generateTiles();
createFactoryMap();
