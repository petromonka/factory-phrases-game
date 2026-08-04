export interface RunProgressSnapshot {
  collectibles: ReadonlySet<string>;
  controllerCompleted: boolean;
  collectibleCount: number;
  collectibleTotal: number;
  parkingUnlocked: boolean;
}

export class RunProgress {
  private readonly knownIds: ReadonlySet<string>;
  private readonly collectibles = new Set<string>();
  private controllerCompleted = false;

  public constructor(characterIds: readonly string[]) {
    this.knownIds = new Set(characterIds);
  }

  public completeCollectible(characterId: string): RunProgressSnapshot {
    if (this.knownIds.has(characterId)) {
      this.collectibles.add(characterId);
    }

    return this.snapshot();
  }

  public completeController(): RunProgressSnapshot {
    this.controllerCompleted = true;
    return this.snapshot();
  }

  public reset(): RunProgressSnapshot {
    this.collectibles.clear();
    this.controllerCompleted = false;
    return this.snapshot();
  }

  public isParkingUnlocked(): boolean {
    return this.collectibles.size === this.knownIds.size && this.controllerCompleted;
  }

  public snapshot(): RunProgressSnapshot {
    return Object.freeze({
      collectibles: new Set(this.collectibles),
      controllerCompleted: this.controllerCompleted,
      collectibleCount: this.collectibles.size,
      collectibleTotal: this.knownIds.size,
      parkingUnlocked: this.isParkingUnlocked()
    });
  }
}
