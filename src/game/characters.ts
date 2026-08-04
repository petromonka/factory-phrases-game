import type { DialogueDefinition } from "./dialogue";

export interface CharacterDefinition {
  id: string;
  name: string;
  room: string;
  dialogue: DialogueDefinition;
  objectId: string;
  spriteKey: string;
}

export const CHARACTERS = [
  {
    id: "security-serhii",
    name: "Охоронець Сергій",
    room: "Прохідна",
    objectId: "npc-security",
    spriteKey: "npc-security",
    dialogue: {
      id: "security-serhii",
      lines: [
        { speaker: "Я", text: "Привіт, Сєрий" },
        { speaker: "Сергій", text: "Здоров" },
        { speaker: "Я", text: "Як там справи? Що скажеш на Пашу?" },
        { speaker: "Сергій", text: "Він мені одразу не понравився, як я тільки його побачив" }
      ]
    }
  },
  {
    id: "it-vasyl",
    name: "Василь",
    room: "Кабінет ІТ",
    objectId: "npc-it",
    spriteKey: "npc-vasyl-tall",
    dialogue: {
      id: "it-vasyl",
      lines: [{ speaker: "Василь", text: "Дімона нема - поїхав кудись і казав, зараз буде" }]
    }
  },
  {
    id: "shifts-serhii",
    name: "Сергій",
    room: "Відділ змін",
    objectId: "npc-shifts",
    spriteKey: "npc-shifts",
    dialogue: {
      id: "shifts-serhii",
      lines: [{ speaker: "Сергій", text: "Поставте нам, будь ласка, фільєр і EASY DMS" }]
    }
  },
  {
    id: "qm-olena",
    name: "Олена",
    room: "Кабінет QM",
    objectId: "npc-qm",
    spriteKey: "npc-qm",
    dialogue: {
      id: "qm-olena",
      lines: [
        {
          speaker: "Олена",
          text: "Я як той пес - хитаю головою і все розумію, але сказати не можу ніч на англійській"
        }
      ]
    }
  },
  {
    id: "sewing-sasha",
    name: "Саша",
    room: "Склад швейного цеху",
    objectId: "npc-sewing",
    spriteKey: "npc-sewing",
    dialogue: {
      id: "sewing-sasha",
      lines: [{ speaker: "Саша", text: "Тут трапилася халепа - маніпулятор типу мишка маєте?" }]
    }
  }
] as const satisfies readonly CharacterDefinition[];
