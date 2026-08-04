export interface DialogueLine {
  speaker: string;
  text: string;
}

export interface DialogueDefinition {
  id: string;
  lines: readonly DialogueLine[];
}

export type DialogueAdvanceResult =
  | { state: "line"; completed: false }
  | { state: "awaiting-close"; completed: true }
  | { state: "closed"; completed: false };

export class DialogueRunner {
  private active?: DialogueDefinition;
  private index = 0;
  private awaitingClose = false;

  public open(dialogue: DialogueDefinition): void {
    if (dialogue.lines.length === 0) {
      throw new Error(`Dialogue ${dialogue.id} has no lines.`);
    }

    this.active = dialogue;
    this.index = 0;
    this.awaitingClose = false;
  }

  public currentId(): string | undefined {
    return this.active?.id;
  }

  public currentLine(): DialogueLine | undefined {
    return this.active?.lines[this.index];
  }

  public isOpen(): boolean {
    return this.active !== undefined;
  }

  public advance(): DialogueAdvanceResult {
    if (!this.active) {
      return { state: "closed", completed: false };
    }

    if (this.awaitingClose) {
      this.close();
      return { state: "closed", completed: false };
    }

    if (this.index < this.active.lines.length - 1) {
      this.index += 1;
      return { state: "line", completed: false };
    }

    this.awaitingClose = true;
    return { state: "awaiting-close", completed: true };
  }

  public close(): void {
    this.active = undefined;
    this.index = 0;
    this.awaitingClose = false;
  }
}

export function createSingleLineDialogue(name: string, text: string): DialogueDefinition {
  return { id: name, lines: [{ speaker: name, text }] };
}
