import { CONTROLLER_REQUESTS } from "./controllers";

export interface AmbientDialogue {
  id: string;
  request: string;
}

export function selectControllerRequest(random: () => number = Math.random): string {
  const value = random();
  const safe = Number.isFinite(value) ? Math.min(Math.max(value, 0), 0.999999999) : 0;
  const index = Math.floor(safe * CONTROLLER_REQUESTS.length);

  return CONTROLLER_REQUESTS[index];
}

export class AmbientDialogueState {
  private current?: AmbientDialogue;

  constructor(private readonly random: () => number = Math.random) {}

  enter(id: string): Readonly<AmbientDialogue> {
    if (!this.current || this.current.id !== id) {
      this.current = { id, request: selectControllerRequest(this.random) };
    }

    return this.snapshot(this.current);
  }

  leave(): void {
    this.current = undefined;
  }

  active(): Readonly<AmbientDialogue> | undefined {
    return this.current ? this.snapshot(this.current) : undefined;
  }

  private snapshot(dialogue: AmbientDialogue): Readonly<AmbientDialogue> {
    return Object.freeze({ ...dialogue });
  }
}
