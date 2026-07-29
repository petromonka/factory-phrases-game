export interface CharacterDefinition {
  id: string;
  name: string;
  room: string;
  phrase: string;
  objectId: string;
  spriteKey: string;
}

export const CHARACTERS = [
  { id: "security-serhii", name: "Охоронець Сергій", room: "Прохідна", phrase: "Він мені одразу не понравився", objectId: "npc-security", spriteKey: "npc-security" },
  { id: "it-vasyl", name: "Василь", room: "Кабінет ІТ", phrase: "Діми нема — поїхав кудись і казав, зараз буде", objectId: "npc-it", spriteKey: "npc-vasyl-tall" },
  { id: "shifts-serhii", name: "Сергій", room: "Відділ змін", phrase: "Поставте нам, будь ласка, філєр і EASY DMS", objectId: "npc-shifts", spriteKey: "npc-shifts" },
  { id: "qm-olena", name: "Олена", room: "Кабінет QM", phrase: "Я як той пес — хитаю головою і все розумію, але сказати не можу ніц на англійській", objectId: "npc-qm", spriteKey: "npc-qm" },
  { id: "sewing-sasha", name: "Саша", room: "Склад швейного цеху", phrase: "Тут трапилася халепа — маніпулятор типу мишка маєте?", objectId: "npc-sewing", spriteKey: "npc-sewing" }
] as const satisfies readonly CharacterDefinition[];
