export interface ControllerDefinition {
  id: string;
  name: string;
  objectId: string;
}

export const CONTROLLERS = [
  { id: "controller-1", name: "Контролер 1", objectId: "controller-1" },
  { id: "controller-2", name: "Контролер 2", objectId: "controller-2" },
  { id: "controller-3", name: "Контролер 3", objectId: "controller-3" },
  { id: "controller-4", name: "Контролер 4", objectId: "controller-4" }
] as const satisfies readonly ControllerDefinition[];

export const CONTROLLER_REQUESTS = [
  "Дайте, будь ласка, нову мишку",
  "Потрібен новий сканер",
  "Потрібен новий комп’ютер",
  "Дайте, будь ласка, новий сенсорний екран"
] as const;
