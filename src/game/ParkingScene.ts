import Phaser from "phaser";
import { DialogueRunner, speakerLabelFor, type DialogueDefinition } from "./dialogue";
import { renderFatalError } from "./errorScreen";
import { EdgeTrigger, nearestInteractable } from "./interaction";
import { movementVector } from "./movement";
import { RunProgress } from "./progress";
import type { MovementSource } from "./touchController";
import { strongerMovement } from "./touchMovement";

const MAP_KEY = "parking-map";
const TILESET_KEY = "factory-tiles";
const MOVEMENT_SPEED = 160;

type TouchInteractionSource = { consumePressed(): boolean; setLabel(label: string): void };

interface MovementKeys {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
}

type ParkingTarget = {
  id: "dimon" | "yura";
  dialogue: DialogueDefinition;
  sprite: Phaser.GameObjects.Sprite;
};

const PARKING_DIALOGUES = {
  dimon: {
    id: "parking-dimon",
    lines: [
      { speaker: "Дімон", text: "Не міган канєшно, але піде" },
      { speaker: "Дімон", text: "Ну все, я пігнав, якщо щось то не дзвоніть і не пишіть 😁" }
    ]
  },
  yura: {
    id: "parking-yura",
    lines: [
      { speaker: "Юра", text: "Щось в мене цееееейво гальмує інтеееернееет в палатці. Гляньте до того хлопці коли буууудете мали час" },
      { speaker: "Я", text: "Зараз будем сі дивили." },
      { speaker: "Юра", text: "Щееее ееее катридж маєте ?" },
      { speaker: "Я", text: "Глянемо Юр." }
    ]
  }
} as const satisfies Record<string, DialogueDefinition>;

function hasPoint(point: { x?: unknown; y?: unknown } | undefined): point is { x: number; y: number } {
  return typeof point?.x === "number" && Number.isFinite(point.x) && typeof point.y === "number" && Number.isFinite(point.y);
}

export class ParkingScene extends Phaser.Scene {
  public player?: Phaser.Physics.Arcade.Sprite;
  private ready = false;
  private loadFailed = false;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: MovementKeys;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private touchMovement!: MovementSource;
  private touchInteraction?: TouchInteractionSource;
  private readonly dialogueRunner = new DialogueRunner();
  private readonly interactionTrigger = new EdgeTrigger();
  private targets: ParkingTarget[] = [];
  private activeTarget?: ParkingTarget;
  private car!: Phaser.GameObjects.Container;
  private parkedCars: Phaser.GameObjects.Container[] = [];
  private dimonDeparted = false;
  private restartQueued = false;
  private promptText!: Phaser.GameObjects.Text;
  private dialoguePanel!: Phaser.GameObjects.Rectangle;
  private dialogueName!: Phaser.GameObjects.Text;
  private dialogueBody!: Phaser.GameObjects.Text;

  public constructor() {
    super("parking");
  }

  public preload(): void {
    this.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, () => {
      this.loadFailed = true;
      this.showFatalError("Не вдалося завантажити карту парковки.");
    });

    this.load.tilemapTiledJSON(MAP_KEY, "assets/maps/parking.json");
    this.load.image(TILESET_KEY, "assets/tiles/factory-tiles.png");
  }

  public create(): void {
    if (this.loadFailed) return;

    try {
      this.touchMovement = this.registry.get("touchMovement") as MovementSource;
      this.touchInteraction = this.registry.get("touchInteraction") as TouchInteractionSource | undefined;
      const map = this.make.tilemap({ key: MAP_KEY });
      const tileset = map.addTilesetImage(TILESET_KEY, TILESET_KEY);
      if (!tileset) throw new Error("The parking tileset is missing.");

      for (const layerName of ["floor", "paint", "objects"]) {
        if (!map.createLayer(layerName, tileset, 0, 0)) {
          throw new Error(`The ${layerName} parking tile layer is missing.`);
        }
      }

      const collisionLayer = map.getObjectLayer("collisions");
      const spawnLayer = map.getObjectLayer("spawn");
      const npcLayer = map.getObjectLayer("npcs");
      const carLayer = map.getObjectLayer("car");
      const tentLayer = map.getObjectLayer("tent");
      const parkedCarLayer = map.getObjectLayer("parked-cars");
      const spawnPoint = spawnLayer?.objects.find((object) => object.name === "player-spawn");
      const dimonPoint = npcLayer?.objects.find((object) => object.name === "npc-dimon");
      const yuraPoint = npcLayer?.objects.find((object) => object.name === "npc-yura");
      const carObject = carLayer?.objects.find((object) => object.name === "dimon-car");
      const tentObject = tentLayer?.objects.find((object) => object.name === "warehouse-tent");
      if (!collisionLayer || !hasPoint(spawnPoint) || !hasPoint(dimonPoint) || !hasPoint(yuraPoint) || !carObject || !tentObject || !parkedCarLayer) {
        throw new Error("The parking object layers are incomplete.");
      }

      this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
      const collisions = this.physics.add.staticGroup();
      for (const object of collisionLayer.objects) {
        const width = object.width ?? 0;
        const height = object.height ?? 0;
        if (width <= 0 || height <= 0) continue;

        const blocker = this.add
          .rectangle((object.x ?? 0) + width / 2, (object.y ?? 0) + height / 2, width, height)
          .setVisible(false);
        collisions.add(blocker);
      }

      this.createTextures();
      this.renderTent(tentObject);
      this.car = this.createCar(
        (carObject.x ?? 0) + (carObject.width ?? 48) / 2,
        (carObject.y ?? 0) + (carObject.height ?? 28) / 2,
        0x75bde8,
        0x245a77
      );
      const parkedColors = [
        [0x58606a, 0x24282d],
        [0x8a6f4d, 0x3b3024],
        [0x7b3f4a, 0x2c1820],
        [0x4d6f5f, 0x1d332a]
      ] as const;
      this.parkedCars = parkedCarLayer.objects.map((object, index) =>
        this.createCar(
          (object.x ?? 0) + (object.width ?? 50) / 2,
          (object.y ?? 0) + (object.height ?? 28) / 2,
          parkedColors[index % parkedColors.length][0],
          parkedColors[index % parkedColors.length][1]
        ).setDepth(11)
      );

      this.player = this.physics.add.sprite(spawnPoint.x, spawnPoint.y, "player-down");
      this.player.setDepth(20).setCollideWorldBounds(true).setSize(10, 12).setOffset(3, 7);
      this.physics.add.collider(this.player, collisions);

      const dimon = this.add.sprite(dimonPoint.x, dimonPoint.y, "npc-dimon").setOrigin(0.5, 1).setDepth(20);
      const yura = this.add.sprite(yuraPoint.x, yuraPoint.y, "npc-yura").setOrigin(0.5, 1).setDepth(20);
      this.targets = [
        { id: "dimon", dialogue: PARKING_DIALOGUES.dimon, sprite: dimon },
        { id: "yura", dialogue: PARKING_DIALOGUES.yura, sprite: yura }
      ];

      const keyboard = this.input.keyboard;
      if (!keyboard) throw new Error("Keyboard input is unavailable.");
      this.cursors = keyboard.createCursorKeys();
      this.wasd = keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D
      }) as MovementKeys;
      this.interactKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

      this.createInterface();
      this.cameras.main
        .setBounds(0, 0, map.widthInPixels, map.heightInPixels)
        .startFollow(this.player, true);

      this.ready = true;
      this.updateStatusMirror("ready", "Парковка");
    } catch (error) {
      console.error(error);
      this.showFatalError("Не вдалося створити карту парковки.");
    }
  }

  public update(): void {
    if (!this.ready || !this.player) return;

    const interactPressed = this.interactionTrigger.update(
      this.interactKey.isDown || Boolean(this.touchInteraction?.consumePressed())
    );

    if (this.dialogueRunner.isOpen()) {
      this.player.setVelocity(0, 0);
      this.promptText.setText("Натисни E, щоб далі").setVisible(true);
      this.touchInteraction?.setLabel("Далі");
      if (interactPressed) this.advanceDialogue();
      return;
    }

    const target = this.findPromptTarget();
    if (target) {
      this.touchInteraction?.setLabel("Говорити");
      this.showInteractionPrompt("Натисни E, щоб говорити", target.id);
      if (interactPressed) this.startDialogue(target);
    } else {
      this.hideInteractionPrompt();
    }

    const keyboardDirection = movementVector({
      left: this.cursors.left.isDown || this.wasd.left.isDown,
      right: this.cursors.right.isDown || this.wasd.right.isDown,
      up: this.cursors.up.isDown || this.wasd.up.isDown,
      down: this.cursors.down.isDown || this.wasd.down.isDown
    });
    const direction = strongerMovement(keyboardDirection, this.touchMovement.current());
    this.player.setVelocity(direction.x * MOVEMENT_SPEED, direction.y * MOVEMENT_SPEED);
    this.updatePlayerDirection(direction.x, direction.y);
  }

  private findPromptTarget(): ParkingTarget | undefined {
    if (!this.player) return undefined;
    const candidates = this.targets
      .filter((target) => target.id !== "dimon" || !this.dimonDeparted)
      .map(({ id, sprite }) => ({ id, x: sprite.x, y: sprite.y }));
    const candidate = nearestInteractable(this.player, candidates);

    return this.targets.find((target) => target.id === candidate?.id);
  }

  private startDialogue(target: ParkingTarget): void {
    this.activeTarget = target;
    this.dialogueRunner.open(target.dialogue);
    this.renderCurrentDialogueLine();
  }

  private advanceDialogue(): void {
    const result = this.dialogueRunner.advance();
    if (result.completed && this.activeTarget?.id === "dimon") {
      this.startCarDeparture();
      this.dialogueRunner.close();
      this.closeDialogue();
      return;
    }
    if (result.completed && this.activeTarget?.id === "yura") {
      this.restartFactory();
      return;
    }
    if (result.state === "closed") {
      this.closeDialogue();
      return;
    }

    this.renderCurrentDialogueLine();
  }

  private startCarDeparture(): void {
    if (this.dimonDeparted || !this.activeTarget) return;

    this.dimonDeparted = true;
    this.activeTarget.sprite.setVisible(false);
    this.tweens.add({
      targets: this.car,
      x: 1010,
      duration: 1400,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.car.setVisible(false);
        this.updateStatusMirror("prompt", "Дімон поїхав", "dimon");
      }
    });
  }

  private restartFactory(): void {
    if (this.restartQueued) return;

    this.restartQueued = true;
    const progress = this.registry.get("runProgress") as RunProgress | undefined;
    progress?.reset();
    this.dialogueRunner.close();
    this.interactionTrigger.reset();
    this.scene.start("factory");
  }

  private renderCurrentDialogueLine(): void {
    const line = this.dialogueRunner.currentLine();
    if (!line || !this.activeTarget) return;

    this.promptText.setVisible(false);
    const speakerLabel = speakerLabelFor(line);
    this.dialogueName.setText(speakerLabel);
    this.dialogueBody.setText(line.text);
    this.dialogueBody.setY(speakerLabel.length > 0 ? 448 : 420);
    this.dialoguePanel.setVisible(true);
    this.dialogueName.setVisible(speakerLabel.length > 0);
    this.dialogueBody.setVisible(true);
    this.updateStatusMirror(
      "dialogue",
      speakerLabel ? `${speakerLabel}: ${line.text}` : line.text,
      this.activeTarget.id
    );
  }

  private closeDialogue(): void {
    this.dialoguePanel.setVisible(false);
    this.dialogueName.setVisible(false);
    this.dialogueBody.setVisible(false);
    this.activeTarget = undefined;
  }

  private showInteractionPrompt(text: string, characterId: string): void {
    this.promptText.setText(text).setVisible(true);
    this.updateStatusMirror("prompt", text, characterId);
  }

  private hideInteractionPrompt(): void {
    this.promptText.setVisible(false);
    this.touchInteraction?.setLabel("E");
    this.updateStatusMirror("ready", "Парковка");
  }

  private renderTent(object: Phaser.Types.Tilemaps.TiledObject): void {
    const x = object.x ?? 728;
    const y = object.y ?? 80;
    const width = object.width ?? 144;
    const height = object.height ?? 112;
    this.add.rectangle(x + width / 2, y + height / 2, width, height, 0x6c7983, 0.72).setDepth(8).setStrokeStyle(4, 0xd8e1df);
    this.add.rectangle(x + width / 2, y + height - 10, 44, 20, 0x222b2d, 0.9).setDepth(9);
    this.add.text(x + width / 2, y + 22, "Склад", {
      fontFamily: '"Courier New", monospace',
      fontSize: "16px",
      color: "#fff4dc",
      stroke: "#171b18",
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(10);
  }

  private createCar(x: number, y: number, color: number, accent: number): Phaser.GameObjects.Container {
    const body = this.add.rectangle(0, 0, 54, 28, color).setStrokeStyle(3, accent);
    const windshield = this.add.rectangle(-12, -6, 11, 7, 0xd9f4ff);
    const window = this.add.rectangle(10, -6, 12, 7, 0xd9f4ff);
    const frontWheel = this.add.rectangle(-16, 15, 10, 5, 0x111111);
    const backWheel = this.add.rectangle(16, 15, 10, 5, 0x111111);
    const light = this.add.rectangle(25, 2, 4, 6, 0xffe08a);

    return this.add.container(x, y, [body, windshield, window, frontWheel, backWheel, light]).setDepth(12);
  }

  private createTextures(): void {
    if (!this.textures.exists("npc-dimon")) {
      this.createNpcTexture("npc-dimon", 0x2b6da8, 0xbde9ff);
    }
    if (!this.textures.exists("npc-yura")) {
      this.createNpcTexture("npc-yura", 0x6b5f3a, 0xffdc76);
    }
  }

  private createNpcTexture(key: string, shirt: number, accent: number): void {
    const graphics = this.make.graphics({ x: 0, y: 0 }, false);
    graphics.fillStyle(0x231b18).fillRect(4, 1, 8, 3);
    graphics.fillStyle(0xe0a675).fillRect(4, 3, 8, 6);
    graphics.fillStyle(0x1e1815).fillRect(6, 5, 1, 1).fillRect(9, 5, 1, 1);
    graphics.fillStyle(shirt).fillRect(3, 9, 10, 8);
    graphics.fillStyle(accent).fillRect(5, 10, 6, 2);
    graphics.fillStyle(0x191919).fillRect(3, 17, 4, 3).fillRect(9, 17, 4, 3);
    graphics.generateTexture(key, 16, 20);
    graphics.destroy();
  }

  private createInterface(): void {
    const fixedText = {
      fontFamily: '"Courier New", monospace',
      color: "#fff4dc",
      stroke: "#171b18",
      strokeThickness: 4
    };

    this.promptText = this.add
      .text(480, 478, "", { ...fixedText, backgroundColor: "#24303a", fontSize: "18px", padding: { x: 12, y: 7 } })
      .setDepth(1001)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setVisible(false);
    this.dialoguePanel = this.add
      .rectangle(480, 450, 640, 150, 0x151b18, 0.96)
      .setDepth(1000)
      .setScrollFactor(0)
      .setStrokeStyle(4, 0xe6b566)
      .setVisible(false);
    this.dialogueName = this.add
      .text(180, 390, "", { ...fixedText, color: "#ffd37c", fontSize: "20px" })
      .setDepth(1001)
      .setScrollFactor(0)
      .setVisible(false);
    this.dialogueBody = this.add
      .text(180, 448, "", { ...fixedText, fontSize: "17px", lineSpacing: 4, wordWrap: { width: 560, useAdvancedWrap: true } })
      .setDepth(1001)
      .setScrollFactor(0)
      .setVisible(false);
  }

  private updatePlayerDirection(x: number, y: number): void {
    if (x === 0 && y === 0) return;

    if (Math.abs(x) > Math.abs(y)) {
      this.player?.setTexture(x < 0 ? "player-left" : "player-right");
    } else {
      this.player?.setTexture(y < 0 ? "player-up" : "player-down");
    }
  }

  private showFatalError(message: string): void {
    this.ready = false;
    this.updateStatusMirror("fatal", message);
    const container = document.getElementById("game");
    if (container) renderFatalError(container, message);
  }

  private updateStatusMirror(state: "ready" | "prompt" | "dialogue" | "fatal", text: string, characterId?: string): void {
    const status = document.getElementById("game-status");
    if (!status) return;

    status.dataset.scene = "parking";
    status.dataset.gameState = state;
    status.dataset.dimonDeparted = String(this.dimonDeparted);
    if (characterId) {
      status.dataset.characterId = characterId;
    } else {
      delete status.dataset.characterId;
    }
    status.textContent = text;
  }
}
