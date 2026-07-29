import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { expect, it } from "vitest";

type MapProperty = { name: string; type: string; value: string };
type MapObject = {
  name: string;
  type?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  properties?: MapProperty[];
};
type Layer = { name: string; type: string; data?: number[]; objects?: MapObject[] };
type FactoryMap = {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: Layer[];
  tilesets: { columns: number; image: string; imagewidth: number; imageheight: number }[];
};

function readMap(): FactoryMap {
  return JSON.parse(readFileSync("public/assets/maps/factory.json", "utf8")) as FactoryMap;
}

function layer(map: FactoryMap, name: string): Layer {
  const found = map.layers.find((candidate) => candidate.name === name);
  if (!found) throw new Error(`Missing ${name} layer`);
  return found;
}

function objectText(object: MapObject): string | undefined {
  return object.properties?.find((property) => property.name === "text")?.value;
}

function reachableCells(map: FactoryMap, start: MapObject, blockedCells = new Set<string>()): Set<string> {
  const collisions = layer(map, "collisions").objects ?? [];
  const blocked = (column: number, row: number) => {
    const centerX = column * map.tilewidth + map.tilewidth / 2;
    const centerY = row * map.tileheight + map.tileheight / 2;
    return blockedCells.has(`${column},${row}`) || collisions.some(
      (collision) =>
        centerX >= collision.x &&
        centerX < collision.x + collision.width &&
        centerY >= collision.y &&
        centerY < collision.y + collision.height
    );
  };
  const startCell = `${Math.floor(start.x / map.tilewidth)},${Math.floor(start.y / map.tileheight)}`;
  const visited = new Set([startCell]);
  const queue = [startCell];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    const [column, row] = current.split(",").map(Number);
    for (const [nextColumn, nextRow] of [[column - 1, row], [column + 1, row], [column, row - 1], [column, row + 1]]) {
      const next = `${nextColumn},${nextRow}`;
      if (nextColumn >= 0 && nextColumn < map.width && nextRow >= 0 && nextRow < map.height && !blocked(nextColumn, nextRow) && !visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }

  return visited;
}

it("contains required layers and game objects", () => {
  const map = readMap();
  const layers = new Map(map.layers.map((mapLayer) => [mapLayer.name, mapLayer]));

  expect([...layers.keys()]).toEqual(expect.arrayContaining(["floor", "walls", "furniture", "collisions", "spawn", "npcs", "signs"]));
  expect(layers.get("spawn")?.objects?.map((object) => object.name)).toContain("player-spawn");
  expect(layers.get("npcs")?.objects?.map((object) => object.name).sort()).toEqual(
    ["npc-it", "npc-qm", "npc-security", "npc-sewing", "npc-shifts"].sort()
  );
  expect(layers.get("collisions")?.objects?.length).toBeGreaterThan(10);
});

it("renders signs from map object properties", () => {
  const source = readFileSync("src/game/FactoryScene.ts", "utf8");

  expect(source).toContain('map.getObjectLayer("signs")');
  expect(source).toContain('getProperty(object, "text")');
  expect(source).toContain(".setOrigin(0.5)");
});

it("uses the agreed 60 by 34 grid and generated original tilesheet", () => {
  const map = readMap();

  expect([map.width, map.height, map.tilewidth, map.tileheight]).toEqual([60, 34, 16, 16]);
  expect(layer(map, "floor").data).toHaveLength(60 * 34);
  expect(map.tilesets).toEqual([
    expect.objectContaining({ columns: 4, image: "../tiles/factory-tiles.png", imagewidth: 64, imageheight: 64 })
  ]);
  const tilesheet = PNG.sync.read(readFileSync("public/assets/tiles/factory-tiles.png"));
  expect([tilesheet.width, tilesheet.height]).toEqual([64, 64]);
});

it("keeps every two-tile doorway clear of collision rectangles", () => {
  const map = readMap();
  const wallTiles = layer(map, "walls").data ?? [];
  const collisions = layer(map, "collisions").objects ?? [];
  const doorIndexes = wallTiles.flatMap((tile, index) => (tile === 5 ? [index] : []));
  const remainingDoorIndexes = new Set(doorIndexes);
  const doorComponents: number[][] = [];

  while (remainingDoorIndexes.size > 0) {
    const start = remainingDoorIndexes.values().next().value;
    if (start === undefined) break;

    const component: number[] = [];
    const queue = [start];
    remainingDoorIndexes.delete(start);
    while (queue.length > 0) {
      const current = queue.shift();
      if (current === undefined) break;
      component.push(current);

      const column = current % map.width;
      const row = Math.floor(current / map.width);
      for (const [nextColumn, nextRow] of [[column - 1, row], [column + 1, row], [column, row - 1], [column, row + 1]]) {
        const next = nextRow * map.width + nextColumn;
        if (
          nextColumn >= 0 &&
          nextColumn < map.width &&
          nextRow >= 0 &&
          nextRow < map.height &&
          remainingDoorIndexes.delete(next)
        ) {
          queue.push(next);
        }
      }
    }
    doorComponents.push(component);
  }

  expect(doorComponents).toHaveLength(5);
  expect(doorComponents.every((component) => component.length === 2)).toBe(true);
  for (const index of doorIndexes) {
    const x = (index % map.width) * map.tilewidth;
    const y = Math.floor(index / map.width) * map.tileheight;
    const overlapsCollision = collisions.some(
      (collision) => x < collision.x + collision.width && x + map.tilewidth > collision.x && y < collision.y + collision.height && y + map.tileheight > collision.y
    );

    expect(overlapsCollision, `door tile at ${x},${y} is blocked`).toBe(false);
  }
});

it("contains every exact world-space sign", () => {
  const signs = layer(readMap(), "signs").objects ?? [];

  expect(signs).toEqual([
    expect.objectContaining({ name: "factory-name", type: "sign", x: 144, y: 488, properties: [{ name: "text", type: "string", value: "Блядер" }] }),
    expect.objectContaining({ name: "checkpoint", type: "sign", x: 144, y: 320, properties: [{ name: "text", type: "string", value: "KPP" }] }),
    expect.objectContaining({ name: "it-office", type: "sign", x: 208, y: 216, properties: [{ name: "text", type: "string", value: "IT" }] }),
    expect.objectContaining({ name: "shifts-office", type: "sign", x: 360, y: 216, properties: [{ name: "text", type: "string", value: "Відділ змін" }] }),
    expect.objectContaining({ name: "qm-office", type: "sign", x: 536, y: 216, properties: [{ name: "text", type: "string", value: "QM" }] }),
    expect.objectContaining({ name: "sewing-storage", type: "sign", x: 728, y: 216, properties: [{ name: "text", type: "string", value: "Склад швейного цеху" }] })
  ]);
});

it("places spawn and security inside the checkpoint", () => {
  const map = readMap();
  const spawn = layer(map, "spawn").objects?.find((object) => object.name === "player-spawn");
  const guard = layer(map, "npcs").objects?.find((object) => object.name === "npc-security");

  expect(spawn).toMatchObject({ x: 136, y: 472 });
  expect(guard).toMatchObject({ x: 88, y: 392 });
});

it("requires the checkpoint exit to reach the factory interior", () => {
  const map = readMap();
  const spawn = layer(map, "spawn").objects?.find((object) => object.name === "player-spawn");

  expect(spawn).toBeDefined();
  const checkpointSealed = reachableCells(map, spawn!, new Set(["8,18", "9,18"]));

  expect(checkpointSealed).not.toContain("20,24");
});

it("allows the player spawn to reach every NPC", () => {
  const map = readMap();
  const spawn = layer(map, "spawn").objects?.find((object) => object.name === "player-spawn");
  const npcs = layer(map, "npcs").objects ?? [];

  expect(spawn).toBeDefined();
  const visited = reachableCells(map, spawn!);
  for (const npc of npcs) {
    expect(visited, `${npc.name} cannot be reached from player-spawn`).toContain(
      `${Math.floor(npc.x / map.tilewidth)},${Math.floor(npc.y / map.tileheight)}`
    );
  }
});
