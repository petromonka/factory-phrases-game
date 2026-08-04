export interface RunProgressSnapshot {
  collectibles: ReadonlySet<string>;
  controllerCompleted: boolean;
  collectibleCount: number;
  collectibleTotal: number;
  hasMouse: boolean;
  hasScanner: boolean;
  mouseDelivered: boolean;
  scannerDelivered: boolean;
  objectiveCount: number;
  objectiveTotal: number;
  parkingUnlocked: boolean;
}

export class RunProgress {
  private readonly knownIds: ReadonlySet<string>;
  private readonly collectibles = new Set<string>();
  private controllerCompleted = false;
  private mousePicked = false;
  private scannerPicked = false;
  private mouseDeliveredState = false;
  private scannerDeliveredState = false;

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

  public pickupMouse(): RunProgressSnapshot {
    if (!this.mouseDeliveredState) this.mousePicked = true;
    return this.snapshot();
  }

  public deliverMouse(): RunProgressSnapshot {
    if (this.mousePicked) {
      this.mousePicked = false;
      this.mouseDeliveredState = true;
    }
    return this.snapshot();
  }

  public pickupScanner(): RunProgressSnapshot {
    if (!this.scannerDeliveredState) this.scannerPicked = true;
    return this.snapshot();
  }

  public deliverScanner(): RunProgressSnapshot {
    if (this.scannerPicked) {
      this.scannerPicked = false;
      this.scannerDeliveredState = true;
    }
    return this.snapshot();
  }

  public reset(): RunProgressSnapshot {
    this.collectibles.clear();
    this.controllerCompleted = false;
    this.mousePicked = false;
    this.scannerPicked = false;
    this.mouseDeliveredState = false;
    this.scannerDeliveredState = false;
    return this.snapshot();
  }

  public isParkingUnlocked(): boolean {
    return (
      this.collectibles.size === this.knownIds.size &&
      this.controllerCompleted &&
      this.mouseDeliveredState &&
      this.scannerDeliveredState
    );
  }

  public snapshot(): RunProgressSnapshot {
    const collectibleTotal = this.knownIds.size;
    const objectiveTotal = collectibleTotal + 3;
    const objectiveCount =
      this.collectibles.size +
      (this.controllerCompleted ? 1 : 0) +
      (this.mouseDeliveredState ? 1 : 0) +
      (this.scannerDeliveredState ? 1 : 0);

    return Object.freeze({
      collectibles: new Set(this.collectibles),
      controllerCompleted: this.controllerCompleted,
      collectibleCount: this.collectibles.size,
      collectibleTotal,
      hasMouse: this.mousePicked,
      hasScanner: this.scannerPicked,
      mouseDelivered: this.mouseDeliveredState,
      scannerDelivered: this.scannerDeliveredState,
      objectiveCount,
      objectiveTotal,
      parkingUnlocked: this.isParkingUnlocked()
    });
  }
}
