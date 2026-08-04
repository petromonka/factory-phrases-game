import { expect, it } from "vitest";
import { CHARACTERS } from "../src/game/characters";
import { CONTROLLERS } from "../src/game/controllers";

it("contains the five approved characters and exact dialogues", () => {
  expect(CHARACTERS).toHaveLength(5);
  expect(CHARACTERS).toMatchObject([
    { id: "security-serhii", name: "Охоронець Сергій", room: "Прохідна", objectId: "npc-security" },
    { id: "it-vasyl", name: "Василь", room: "Кабінет ІТ", objectId: "npc-it" },
    { id: "shifts-serhii", name: "Сергій", room: "Відділ змін", objectId: "npc-shifts" },
    { id: "qm-olena", name: "Олена", room: "Кабінет QM", objectId: "npc-qm" },
    { id: "sewing-sasha", name: "Олександр", room: "Склад швейного цеху", objectId: "npc-sewing" }
  ]);
});

it("uses exact guard dialogue as a four-line conversation", () => {
  const guard = CHARACTERS.find((character) => character.id === "security-serhii");

  expect(guard?.dialogue.lines).toEqual([
    { speaker: "Я", text: "Привіт, Сєрий" },
    { speaker: "Сергій", text: "Здоров" },
    { speaker: "Я", text: "Як там справи? Що скажеш на Пашу?" },
    { speaker: "Сергій", text: "Він мені одразу не понравився, як я тільки його побачив" }
  ]);
});

it("assigns Vasyl the dedicated tall sprite", () => {
  const vasyl = CHARACTERS.find((character) => character.id === "it-vasyl");

  expect(vasyl?.spriteKey).toBe("npc-vasyl-tall");
  expect(CHARACTERS.filter((character) => character.id !== "it-vasyl"))
    .not.toContainEqual(expect.objectContaining({ spriteKey: "npc-vasyl-tall" }));
});

it("keeps five collectible characters and four ambient controllers with unique ids", () => {
  const ids = [
    ...CHARACTERS.map((character) => character.id),
    ...CONTROLLERS.map((controller) => controller.id)
  ];

  expect(CHARACTERS).toHaveLength(5);
  expect(CONTROLLERS).toHaveLength(4);
  expect(new Set(ids)).toHaveLength(ids.length);
});
