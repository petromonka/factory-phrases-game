import { CHARACTERS } from "./characters";

const KNOWN_CHARACTER_IDS: ReadonlySet<string> = new Set(CHARACTERS.map((character) => character.id));
const PROGRESS_KEY = "factory-phrases-progress-v1";

export function parseProgress(raw: string | null): ReadonlySet<string> {
  try {
    const parsed: unknown = JSON.parse(raw ?? "[]");
    if (!Array.isArray(parsed)) {
      return new Set();
    }

    return new Set(parsed.filter((value): value is string => typeof value === "string" && KNOWN_CHARACTER_IDS.has(value)));
  } catch {
    return new Set();
  }
}

export function discover(progress: ReadonlySet<string>, characterId: string): ReadonlySet<string> {
  return new Set([...progress, characterId]);
}

export function isComplete(progress: ReadonlySet<string>): boolean {
  return [...KNOWN_CHARACTER_IDS].every((characterId) => progress.has(characterId));
}

export class ProgressStore {
  private memory: ReadonlySet<string> = new Set();
  private storageIsUsable: boolean;

  public constructor(private readonly storage: Storage | undefined) {
    this.storageIsUsable = storage !== undefined;
  }

  public load(): ReadonlySet<string> {
    if (!this.storage || !this.storageIsUsable) {
      return this.memory;
    }

    try {
      const progress = parseProgress(this.storage.getItem(PROGRESS_KEY));
      this.memory = progress;
      return progress;
    } catch {
      this.storageIsUsable = false;
      return this.memory;
    }
  }

  public save(progress: ReadonlySet<string>): void {
    this.memory = new Set(progress);

    try {
      this.storage?.setItem(PROGRESS_KEY, JSON.stringify([...progress]));
    } catch {
      this.storageIsUsable = false;
      // Storage access can be blocked by browser privacy settings.
    }
  }
}
