import Phaser from "phaser";
import { CHARACTERS } from "./characters";
import { AmbientDialogueState } from "./controllerDialogue";
import { CONTROLLERS } from "./controllers";
import { renderFatalError } from "./errorScreen";
import { proximityDialogueTarget } from "./interaction";
import { movementVector } from "./movement";
import { discover, isComplete, ProgressStore } from "./progress";
import type { MovementSource } from "./touchController";
import { strongerMovement } from "./touchMovement";

const MAP_KEY = "factory-map";
const TILESET_KEY = "factory-tiles";
const MOVEMENT_SPEED = 160;

type TiledProperty = { name: string; value: unknown };

function getProperty(object: Phaser.Types.Tilemaps.TiledObject, name: string): unknown {
  const properties = object.properties as TiledProperty[] | undefined;
  return properties?.find((property) => property.name === name)?.value;
}

export type NpcTarget =
  | { kind: "collectible"; id: string; name: string; phrase: string; sprite: Phaser.GameObjects.Sprite }
  | { kind: "ambient"; id: string; name: string; sprite: Phaser.GameObjects.Sprite };

export function isCollectibleTarget(
  target: { kind: "collectible" | "ambient" }
): target is { kind: "collectible" } {
  return target.kind === "collectible";
}

export function hasFinitePointCoordinates(
  point: { x?: unknown; y?: unknown } | undefined
): point is { x: number; y: number } {
  return (
    typeof point?.x === "number" &&
    Number.isFinite(point.x) &&
    typeof point.y === "number" &&
    Number.isFinite(point.y)
  );
}

interface DialogueTransitionActions {
  close(): void;
  openCollectible(target: Extract<NpcTarget, { kind: "collectible" }>): void;
  openAmbient(target: Extract<NpcTarget, { kind: "ambient" }>, request: string): void;
}

export function transitionNpcTarget(
  activeTargetId: string | undefined,
  nextTarget: NpcTarget | undefined,
  ambientState: AmbientDialogueState,
  actions: DialogueTransitionActions
): string | undefined {
  if (nextTarget?.id === activeTargetId) {
    return activeTargetId;
  }

  if (activeTargetId) {
    actions.close();
  }
  ambientState.leave();

  if (nextTarget) {
    if (isCollectibleTarget(nextTarget)) {
      actions.openCollectible(nextTarget);
    } else {
      actions.openAmbient(nextTarget, ambientState.enter(nextTarget.id).request);
    }
  }

  return nextTarget?.id;
}

interface MovementKeys {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
}

export class FactoryScene extends Phaser.Scene {
  private ready = false;
  private loadFailed = false;
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: MovementKeys;
  private touchMovement!: MovementSource;
  private npcs: NpcTarget[] = [];
  private readonly ambientDialogueState = new AmbientDialogueState();
  private progressStore!: ProgressStore;
  private progress: ReadonlySet<string> = new Set();
  private activeCharacterId?: string;
  private completionShown = false;
  private counterText!: Phaser.GameObjects.Text;
  private dialoguePanel!: Phaser.GameObjects.Rectangle;
  private dialogueName!: Phaser.GameObjects.Text;
  private dialogueBody!: Phaser.GameObjects.Text;
  private completionText!: Phaser.GameObjects.Text;

  public constructor() {
    super("factory");
  }

  public preload(): void {
    this.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, () => {
      this.loadFailed = true;
      this.showFatalError("Не вдалося завантажити карту.");
    });

    this.load.tilemapTiledJSON(MAP_KEY, "assets/maps/factory.json");
    this.load.image(TILESET_KEY, "assets/tiles/factory-tiles.png");
  }

  public create(): void {
    if (this.loadFailed) {
      return;
    }

    try {
      this.touchMovement = this.registry.get("touchMovement") as MovementSource;
      const map = this.make.tilemap({ key: MAP_KEY });
      const tileset = map.addTilesetImage(TILESET_KEY, TILESET_KEY);
      if (!tileset) {
        throw new Error("The factory tileset is missing.");
      }

      for (const layerName of ["floor", "walls", "furniture"]) {
        if (!map.createLayer(layerName, tileset, 0, 0)) {
          throw new Error(`The ${layerName} tile layer is missing.`);
        }
      }

      const collisionLayer = map.getObjectLayer("collisions");
      const spawnLayer = map.getObjectLayer("spawn");
      const npcLayer = map.getObjectLayer("npcs");
      const controllerLayer = map.getObjectLayer("controllers");
      const signLayer = map.getObjectLayer("signs");
      const spawnPoint = spawnLayer?.objects.find((object) => object.name === "player-spawn");
      if (!collisionLayer || !spawnPoint || !npcLayer || !controllerLayer || !signLayer) {
        throw new Error("The factory object layers are incomplete.");
      }

      this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
      const collisions = this.physics.add.staticGroup();
      for (const object of collisionLayer.objects) {
        const width = object.width ?? 0;
        const height = object.height ?? 0;
        if (width <= 0 || height <= 0) {
          continue;
        }

        const blocker = this.add
          .rectangle((object.x ?? 0) + width / 2, (object.y ?? 0) + height / 2, width, height)
          .setVisible(false);
        collisions.add(blocker);
      }

      this.createPlayerTextures();
      this.createNpcTextures();

      this.player = this.physics.add.sprite(spawnPoint.x ?? 0, spawnPoint.y ?? 0, "player-down");
      this.player.setDepth(20).setCollideWorldBounds(true).setSize(10, 12).setOffset(3, 7);
      this.physics.add.collider(this.player, collisions);

      for (const object of signLayer.objects) {
        const text = getProperty(object, "text");
        if (typeof text !== "string" || object.x === undefined || object.y === undefined) {
          console.error(`Skipping malformed sign ${object.name || object.id}.`);
          continue;
        }

        this.add.text(object.x, object.y, text, {
          fontFamily: '"Courier New", monospace',
          fontSize: text === "Блядер" ? "24px" : "15px",
          color: "#fff4dc",
          backgroundColor: "#24303a",
          padding: { x: 6, y: 3 },
          stroke: "#171b18",
          strokeThickness: 2
        }).setOrigin(0.5).setDepth(15);
      }

      const collectibleNpcs: NpcTarget[] = CHARACTERS.flatMap((character) => {
        const point = npcLayer.objects.find((object) => object.name === character.objectId);
        if (!hasFinitePointCoordinates(point)) {
          console.error(`Skipping ${character.id}: map point ${character.objectId} is missing or malformed.`);
          return [];
        }

        return [
          {
            kind: "collectible" as const,
            id: character.id,
            name: character.name,
            phrase: character.phrase,
            sprite: this.add.sprite(point.x, point.y, character.spriteKey).setOrigin(0.5, 1).setDepth(20)
          }
        ];
      });
      const ambientNpcs: NpcTarget[] = CONTROLLERS.flatMap((controller) => {
        const point = controllerLayer.objects.find((object) => object.name === controller.objectId);
        if (!hasFinitePointCoordinates(point)) {
          console.error(`Skipping ${controller.id}: map point ${controller.objectId} is missing or malformed.`);
          return [];
        }

        return [
          {
            kind: "ambient" as const,
            id: controller.id,
            name: controller.name,
            sprite: this.add.sprite(point.x, point.y, "npc-controller").setOrigin(0.5, 1).setDepth(20)
          }
        ];
      });
      this.npcs = [...collectibleNpcs, ...ambientNpcs];

      const keyboard = this.input.keyboard;
      if (!keyboard) {
        throw new Error("Keyboard input is unavailable.");
      }

      this.cursors = keyboard.createCursorKeys();
      this.wasd = keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D
      }) as MovementKeys;
      this.createInterface();
      this.progressStore = new ProgressStore(this.getStorage());
      this.progress = this.progressStore.load();
      this.completionShown = isComplete(this.progress);
      this.updateCounter();

      this.cameras.main
        .setBounds(0, 0, map.widthInPixels, map.heightInPixels)
        .startFollow(this.player, true);

      this.ready = true;
      this.updateStatusMirror("ready", "Гра готова");
    } catch (error) {
      console.error(error);
      this.showFatalError("Не вдалося створити карту заводу.");
    }
  }

  public update(): void {
    if (!this.ready) {
      return;
    }

    const keyboardDirection = movementVector({
      left: this.cursors.left.isDown || this.wasd.left.isDown,
      right: this.cursors.right.isDown || this.wasd.right.isDown,
      up: this.cursors.up.isDown || this.wasd.up.isDown,
      down: this.cursors.down.isDown || this.wasd.down.isDown
    });
    const touchDirection = this.touchMovement.current();
    const direction = strongerMovement(keyboardDirection, touchDirection);
    this.player.setVelocity(direction.x * MOVEMENT_SPEED, direction.y * MOVEMENT_SPEED);
    this.updatePlayerDirection(direction.x, direction.y);

    const targetId = proximityDialogueTarget(
      this.player,
      this.npcs.map(({ id, sprite }) => ({
        id,
        x: sprite.x,
        y: sprite.y
      }))
    );
    if (targetId !== this.activeCharacterId) {
      const target = this.npcs.find(({ id }) => id === targetId);
      this.activeCharacterId = transitionNpcTarget(
        this.activeCharacterId,
        target,
        this.ambientDialogueState,
        {
          close: () => this.closeDialogue(),
          openCollectible: (collectible) => this.openDialogue(collectible),
          openAmbient: (ambient, request) => this.openAmbientDialogue(ambient, request)
        }
      );
    }
  }

  private createPlayerTextures(): void {
    if (this.textures.exists("player-down")) {
      return;
    }

    for (const direction of ["down", "up", "left", "right"] as const) {
      const graphics = this.make.graphics({ x: 0, y: 0 }, false);
      graphics.fillStyle(0x18223a).fillRect(3, 8, 10, 9);
      graphics.fillStyle(0x315cab).fillRect(4, 9, 8, 7);
      graphics.fillStyle(0xf1b887).fillRect(4, 2, 8, 7);
      graphics.fillStyle(0x563627).fillRect(4, 1, 8, 3);
      graphics.fillStyle(0x242019);

      if (direction === "down") {
        graphics.fillRect(6, 5, 1, 1).fillRect(9, 5, 1, 1);
      } else if (direction === "up") {
        graphics.fillRect(4, 3, 8, 4);
      } else if (direction === "left") {
        graphics.fillRect(4, 5, 1, 1);
      } else {
        graphics.fillRect(11, 5, 1, 1);
      }

      graphics.fillStyle(0x10151f).fillRect(3, 17, 4, 3).fillRect(9, 17, 4, 3);
      graphics.generateTexture(`player-${direction}`, 16, 20);
      graphics.destroy();
    }
  }

  private createNpcTextures(): void {
    const variants = [
      { key: "npc-security", shirt: 0x4e6071, accent: 0xc3cfda },
      { key: "npc-shifts", shirt: 0x9b7a28, accent: 0xffd76e },
      { key: "npc-qm", shirt: 0x375e9f, accent: 0x77b9ff },
      { key: "npc-sewing", shirt: 0xa4542d, accent: 0xffa465 },
      { key: "npc-controller", shirt: 0xe06b23, accent: 0xfff06a }
    ];

    for (const variant of variants) {
      if (this.textures.exists(variant.key)) {
        continue;
      }

      const graphics = this.make.graphics({ x: 0, y: 0 }, false);
      graphics.fillStyle(0x231b18).fillRect(4, 1, 8, 3);
      graphics.fillStyle(0xe0a675).fillRect(4, 3, 8, 6);
      graphics.fillStyle(0x1e1815).fillRect(6, 5, 1, 1).fillRect(9, 5, 1, 1);
      graphics.fillStyle(variant.shirt).fillRect(3, 9, 10, 8);
      graphics.fillStyle(variant.accent).fillRect(5, 10, 6, 2);
      graphics.fillStyle(0x191919).fillRect(3, 17, 4, 3).fillRect(9, 17, 4, 3);
      graphics.generateTexture(variant.key, 16, 20);
      graphics.destroy();
    }

    if (this.textures.exists("npc-vasyl-tall")) {
      return;
    }

    const graphics = this.make.graphics({ x: 0, y: 0 }, false);
    graphics.fillStyle(0x231b18).fillRect(4, 1, 8, 3);
    graphics.fillStyle(0xe0a675).fillRect(4, 3, 8, 6);
    graphics.fillStyle(0x1e1815).fillRect(6, 5, 1, 1).fillRect(9, 5, 1, 1);
    graphics.fillStyle(0x3c7b55).fillRect(3, 9, 10, 14);
    graphics.fillStyle(0x95e0ad).fillRect(5, 11, 6, 3);
    graphics.fillStyle(0x191919).fillRect(3, 23, 4, 9).fillRect(9, 23, 4, 9);
    graphics.generateTexture("npc-vasyl-tall", 16, 32);
    graphics.destroy();
  }

  private createInterface(): void {
    const fixedText = {
      fontFamily: '"Courier New", monospace',
      color: "#fff4dc",
      stroke: "#171b18",
      strokeThickness: 4
    };

    this.counterText = this.add
      .text(20, 18, "", { ...fixedText, fontSize: "20px" })
      .setDepth(1000)
      .setScrollFactor(0);
    this.dialoguePanel = this.add
      .rectangle(480, 450, 880, 146, 0x151b18, 0.96)
      .setDepth(1000)
      .setScrollFactor(0)
      .setStrokeStyle(4, 0xe6b566)
      .setVisible(false);
    this.dialogueName = this.add
      .text(64, 391, "", { ...fixedText, color: "#ffd37c", fontSize: "20px" })
      .setDepth(1001)
      .setScrollFactor(0)
      .setVisible(false);
    this.dialogueBody = this.add
      .text(64, 425, "", {
        ...fixedText,
        fontSize: "18px",
        lineSpacing: 4,
        wordWrap: { width: 830, useAdvancedWrap: true }
      })
      .setDepth(1001)
      .setScrollFactor(0)
      .setVisible(false);
    this.completionText = this.add
      .text(480, 52, "Зміну завершено. Усі важливі питання вирішено", {
        ...fixedText,
        backgroundColor: "#24392c",
        color: "#f8d98a",
        fontSize: "19px",
        padding: { x: 16, y: 10 }
      })
      .setDepth(1001)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setVisible(false);
  }

  private openDialogue(target: Extract<NpcTarget, { kind: "collectible" }>): void {
    this.dialogueName.setText(target.name);
    this.dialogueBody.setText(target.phrase);
    this.dialoguePanel.setVisible(true);
    this.dialogueName.setVisible(true);
    this.dialogueBody.setVisible(true);
    this.updateStatusMirror("dialogue", `${target.name}: ${target.phrase}`, target.id);

    const nextProgress = discover(this.progress, target.id);
    if (nextProgress.size === this.progress.size) {
      return;
    }

    this.progress = nextProgress;
    this.progressStore.save(this.progress);
    this.updateCounter();

    if (!this.completionShown && isComplete(this.progress)) {
      this.completionShown = true;
      this.completionText.setVisible(true);
      this.time.delayedCall(6000, () => this.completionText.setVisible(false));
    }
  }

  private openAmbientDialogue(target: Extract<NpcTarget, { kind: "ambient" }>, request: string): void {
    this.dialogueName.setText(target.name);
    this.dialogueBody.setText(request);
    this.dialoguePanel.setVisible(true);
    this.dialogueName.setVisible(true);
    this.dialogueBody.setVisible(true);
    this.updateStatusMirror("dialogue", `${target.name}: ${request}`, target.id);
  }

  private closeDialogue(): void {
    this.dialoguePanel.setVisible(false);
    this.dialogueName.setVisible(false);
    this.dialogueBody.setVisible(false);
    this.updateStatusMirror("ready", "Гра готова");
  }

  private updateCounter(): void {
    this.counterText.setText(`Фрази: ${this.progress.size}/${CHARACTERS.length}`);
  }

  private updatePlayerDirection(x: number, y: number): void {
    if (x === 0 && y === 0) {
      return;
    }

    if (Math.abs(x) > Math.abs(y)) {
      this.player.setTexture(x < 0 ? "player-left" : "player-right");
    } else {
      this.player.setTexture(y < 0 ? "player-up" : "player-down");
    }
  }

  private getStorage(): Storage | undefined {
    try {
      return window.localStorage;
    } catch {
      return undefined;
    }
  }

  private showFatalError(message: string): void {
    this.ready = false;
    this.updateStatusMirror("fatal", message);
    const container = document.getElementById("game");
    if (container) {
      renderFatalError(container, message);
    }
  }

  private updateStatusMirror(state: "ready" | "dialogue" | "fatal", text: string, characterId?: string): void {
    const status = document.getElementById("game-status");
    if (!status) {
      return;
    }

    status.dataset.gameState = state;
    if (characterId) {
      status.dataset.characterId = characterId;
    } else {
      delete status.dataset.characterId;
    }
    status.textContent = text;
  }
}
