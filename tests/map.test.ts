import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

type MapObject = { name: string; x: number; y: number; width: number; height: number };
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

it("contains required layers and game objects", () => {
  const map = readMap();
  const layers = new Map(map.layers.map((mapLayer) => [mapLayer.name, mapLayer]));

  expect([...layers.keys()]).toEqual(expect.arrayContaining(["floor", "walls", "furniture", "collisions", "spawn", "npcs"]));
  expect(layers.get("spawn")?.objects?.map((object) => object.name)).toContain("player-spawn");
  expect(layers.get("npcs")?.objects?.map((object) => object.name).sort()).toEqual(
    ["npc-it", "npc-qm", "npc-security", "npc-sewing", "npc-shifts"].sort()
  );
  expect(layers.get("collisions")?.objects?.length).toBeGreaterThan(10);
});

it("uses the agreed 60 by 34 grid and generated original tilesheet", () => {
  const map = readMap();

  expect([map.width, map.height, map.tilewidth, map.tileheight]).toEqual([60, 34, 16, 16]);
  expect(layer(map, "floor").data).toHaveLength(60 * 34);
  expect(map.tilesets).toEqual([
    expect.objectContaining({ columns: 4, image: "../tiles/factory-tiles.png", imagewidth: 64, imageheight: 64 })
  ]);
  expect(readFileSync("public/assets/tiles/factory-tiles.png").subarray(0, 8)).toEqual(
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  );
});

it("keeps every two-tile doorway clear of collision rectangles", () => {
  const map = readMap();
  const wallTiles = layer(map, "walls").data ?? [];
  const collisions = layer(map, "collisions").objects ?? [];
  const doorIndexes = wallTiles.flatMap((tile, index) => (tile === 5 ? [index] : []));

  expect(doorIndexes.length).toBeGreaterThanOrEqual(12);
  for (const index of doorIndexes) {
    const x = (index % map.width) * map.tilewidth;
    const y = Math.floor(index / map.width) * map.tileheight;
    const overlapsCollision = collisions.some(
      (collision) => x < collision.x + collision.width && x + map.tilewidth > collision.x && y < collision.y + collision.height && y + map.tileheight > collision.y
    );

    expect(overlapsCollision, `door tile at ${x},${y} is blocked`).toBe(false);
  }
});

it("allows the player spawn to reach every office NPC", () => {
  const map = readMap();
  const collisions = layer(map, "collisions").objects ?? [];
  const spawn = layer(map, "spawn").objects?.find((object) => object.name === "player-spawn");
  const npcs = layer(map, "npcs").objects ?? [];
  const blocked = (column: number, row: number) => {
    const centerX = column * map.tilewidth + map.tilewidth / 2;
    const centerY = row * map.tileheight + map.tileheight / 2;
    return collisions.some(
      (collision) =>
        centerX >= collision.x &&
        centerX < collision.x + collision.width &&
        centerY >= collision.y &&
        centerY < collision.y + collision.height
    );
  };
  const start = `${Math.floor((spawn?.x ?? -16) / map.tilewidth)},${Math.floor((spawn?.y ?? -16) / map.tileheight)}`;
  const visited = new Set([start]);
  const queue = [start];

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

  expect(spawn).toBeDefined();
  for (const npc of npcs) {
    expect(visited, `${npc.name} cannot be reached from player-spawn`).toContain(
      `${Math.floor(npc.x / map.tilewidth)},${Math.floor(npc.y / map.tileheight)}`
    );
  }
});
