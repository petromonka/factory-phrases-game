import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

type Layer = {
  name: string;
  type: string;
  data?: number[];
  objects?: Array<{ name: string; type?: string; x: number; y: number; width?: number; height?: number }>;
};
type ParkingMap = { width: number; height: number; tilewidth: number; tileheight: number; layers: Layer[] };

function readParkingMap(): ParkingMap {
  return JSON.parse(readFileSync("public/assets/maps/parking.json", "utf8")) as ParkingMap;
}

it("contains required parking layers and objects", () => {
  const map = readParkingMap();
  const layers = new Map(map.layers.map((layer) => [layer.name, layer]));

  expect([map.width, map.height, map.tilewidth, map.tileheight]).toEqual([60, 34, 16, 16]);
  expect([...layers.keys()]).toEqual(expect.arrayContaining(["floor", "paint", "objects", "collisions", "spawn", "npcs", "car", "tent"]));
  expect(layers.get("spawn")?.objects?.map((object) => object.name)).toContain("player-spawn");
  expect(layers.get("npcs")?.objects?.map((object) => object.name).sort()).toEqual(["npc-dimon", "npc-yura"]);
  expect(layers.get("car")?.objects?.map((object) => object.name)).toContain("dimon-car");
  expect(layers.get("tent")?.objects?.map((object) => object.name)).toContain("warehouse-tent");
  expect(layers.get("collisions")?.objects?.length).toBeGreaterThan(4);
});

it("contains multiple parked car objects for a real parking feel", () => {
  const map = readParkingMap();
  const parkingCars = map.layers
    .find((layer) => layer.name === "parked-cars")
    ?.objects?.filter((object) => object.type === "parked-car") ?? [];

  expect(parkingCars).toHaveLength(4);
});
