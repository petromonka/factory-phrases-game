import { expect, it } from "vitest";
import { CHARACTERS } from "../src/game/characters";

it("contains the five approved characters and exact phrases", () => {
  expect(CHARACTERS).toHaveLength(5);
  expect(CHARACTERS).toMatchObject([
    { id: "security-serhii", name: "Охоронець Сергій", room: "Прохідна", phrase: "Він мені одразу не понравився", objectId: "npc-security" },
    { id: "it-vasyl", name: "Василь", room: "Кабінет ІТ", phrase: "Діми нема — поїхав кудись і казав, зараз буде", objectId: "npc-it" },
    { id: "shifts-serhii", name: "Сергій", room: "Відділ змін", phrase: "Поставте нам, будь ласка, філєр і EASY DMS", objectId: "npc-shifts" },
    { id: "qm-olena", name: "Олена", room: "Кабінет QM", phrase: "Я як той пес — хитаю головою і все розумію, але сказати не можу ніц на англійській", objectId: "npc-qm" },
    { id: "sewing-sasha", name: "Саша", room: "Склад швейного цеху", phrase: "Тут трапилася халепа — маніпулятор типу мишка маєте?", objectId: "npc-sewing" }
  ]);
});

it("assigns Vasyl the dedicated tall sprite", () => {
  const vasyl = CHARACTERS.find((character) => character.id === "it-vasyl");

  expect(vasyl?.spriteKey).toBe("npc-vasyl-tall");
  expect(CHARACTERS.filter((character) => character.id !== "it-vasyl"))
    .not.toContainEqual(expect.objectContaining({ spriteKey: "npc-vasyl-tall" }));
});
