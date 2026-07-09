import Phaser from "phaser";
import type { Resident } from "@/core/resident";
import {
  personalityCategory,
  personalityExpression,
  personalityToTags,
  type PersonalityCategory,
} from "@/core/personality-derived";
import type { SceneIntent, SceneType } from "@/events";
import { colorForAvatar } from "./avatar-palette";

export interface IslandSceneData {
  resident: Resident;
}

const PILOT_RESIDENT_TEXTURE_KEY = "pilot-resident-mara";
const PILOT_RESIDENT_TEXTURE_PATH = "/art/pilot/mara_pilot_v4.png";
const PILOT_RESIDENT_SCALE = 0.31;

const STAGE_CENTER_X = 480;
const STAGE_AVATAR_Y = 258;
const SCENE_BUBBLE_OFFSET_Y = -176;

// Placeholder de texto hasta que F4.4/la libreria de arte conecten los 8
// iconos reales de escena (art_library.md sec. 9); social scenes usan labels
// distintos de sus equivalentes "solo" (p.ej. chat vs lonely) para no confundir.
const SCENE_ICONS: Record<SceneType, string> = {
  hungry: "Food",
  tired: "Rest",
  bored: "Play",
  lonely: "Chat",
  quirk: "Quirk",
  zone_opening: "Zone",
  meet: "Meet",
  chat: "Talk",
  argument: "Argue",
  reconcile: "Makeup",
  flirt: "Flirt",
  confess: "Confess",
  propose: "Propose",
};

/**
 * Colores de acento puramente decorativos (placeholder), uno por categoría
 * derivada (`personalityCategory`). Solo afectan al trazo de la "casa"; no son
 * dato de dominio ni se guardan — se recalculan siempre desde la personalidad.
 */
const CATEGORY_ACCENT: Record<PersonalityCategory, number> = {
  Equilibrada: 0xffffff,
  Sociable: 0xe07a5f,
  Reservada: 0x3d5a80,
  Cariñosa: 0xe8a55c,
  Excéntrica: 0x9b5de5,
};

/**
 * Color de texto del nombre según la expresión derivada
 * (`personalityExpression`): otro placeholder puramente visual.
 */
const EXPRESSION_ACCENT: Record<string, string> = {
  animada: "#ffd166",
  sonriente: "#f4a6c6",
  seria: "#9db4c0",
  peculiar: "#c77dff",
  neutral: "#ffffff",
};

/**
 * Escena Phaser de Fase 1: muestra un único residente "en su casa" con un
 * placeholder (rectángulo = casa, círculo teñido = avatar) + nombre + resumen
 * de personalidad. Sin isla, sin mapa, sin varios residentes (fases futuras).
 */
export class IslandScene extends Phaser.Scene {
  static readonly KEY = "IslandScene";

  private resident: Resident | null = null;
  private houseGraphics?: Phaser.GameObjects.Graphics;
  private avatarGraphics?: Phaser.GameObjects.Graphics;
  private pilotResidentSprite?: Phaser.GameObjects.Image;
  private pilotIdleTween?: Phaser.Tweens.Tween;
  private nameText?: Phaser.GameObjects.Text;
  private personalityText?: Phaser.GameObjects.Text;
  private categoryText?: Phaser.GameObjects.Text;
  private needsText?: Phaser.GameObjects.Text;
  private sceneBubbleText?: Phaser.GameObjects.Text;
  private reactionText?: Phaser.GameObjects.Text;

  constructor() {
    super(IslandScene.KEY);
  }

  init(data: IslandSceneData): void {
    this.resident = data.resident;
  }

  preload(): void {
    this.load.image(PILOT_RESIDENT_TEXTURE_KEY, PILOT_RESIDENT_TEXTURE_PATH);
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#1f6f5c");

    this.houseGraphics = this.add.graphics();
    this.drawHouse(0x5c3a24);

    this.avatarGraphics = this.add.graphics();
    this.pilotResidentSprite = this.add
      .image(0, 0, PILOT_RESIDENT_TEXTURE_KEY)
      .setOrigin(0.5)
      .setScale(PILOT_RESIDENT_SCALE)
      .setVisible(false);
    this.nameText = this.add
      .text(0, 0, "", { fontFamily: "sans-serif", fontSize: "32px", color: "#ffffff" })
      .setOrigin(0.5, 0);
    this.personalityText = this.add
      .text(0, 0, "", {
        fontFamily: "sans-serif",
        fontSize: "15px",
        color: "#eaeaea",
        align: "center",
        wordWrap: { width: 620 },
      })
      .setOrigin(0.5, 0);
    this.categoryText = this.add
      .text(0, 0, "", {
        fontFamily: "sans-serif",
        fontSize: "16px",
        fontStyle: "italic",
        color: "#ffffff",
        align: "center",
        wordWrap: { width: 620 },
      })
      .setOrigin(0.5, 0);
    this.needsText = this.add
      .text(0, 0, "", {
        fontFamily: "sans-serif",
        fontSize: "15px",
        color: "#f8f1d8",
        align: "center",
        wordWrap: { width: 620 },
      })
      .setOrigin(0.5, 0);
    this.sceneBubbleText = this.add
      .text(0, 0, "", {
        fontFamily: "sans-serif",
        fontSize: "16px",
        color: "#402a20",
        backgroundColor: "#fff8df",
        padding: { x: 14, y: 8 },
        align: "center",
        wordWrap: { width: 320 },
      })
      .setOrigin(0.5, 1)
      .setVisible(false);
    this.reactionText = this.add
      .text(0, 0, "", {
        fontFamily: "sans-serif",
        fontSize: "17px",
        color: "#ffffff",
        backgroundColor: "#27313a",
        padding: { x: 12, y: 8 },
        align: "center",
        wordWrap: { width: 380 },
      })
      .setOrigin(0.5, 0)
      .setVisible(false);

    if (this.resident) {
      this.renderResident(this.resident);
    }
  }

  /** "Casa" placeholder: un rectángulo centrado, con el trazo teñido por categoría. */
  private drawHouse(strokeColor: number): void {
    if (!this.houseGraphics) return;
    this.houseGraphics.clear();
    this.houseGraphics.fillStyle(0x247866, 1);
    this.houseGraphics.fillRect(0, 0, 960, 600);

    this.houseGraphics.fillStyle(0x7aa85d, 1);
    this.houseGraphics.fillRoundedRect(70, 428, 820, 128, 36);
    this.houseGraphics.fillStyle(0xc98a55, 1);
    this.houseGraphics.fillRoundedRect(120, 60, 720, 360, 28);
    this.houseGraphics.fillStyle(0x9b6542, 1);
    this.houseGraphics.fillRoundedRect(144, 86, 672, 310, 22);
    this.houseGraphics.lineStyle(5, strokeColor, 0.9);
    this.houseGraphics.strokeRoundedRect(120, 60, 720, 360, 28);

    this.houseGraphics.fillStyle(0x000000, 0.18);
    this.houseGraphics.fillEllipse(480, 386, 230, 40);
  }

  private startPilotIdleTween(baseY: number): void {
    if (!this.pilotResidentSprite) return;
    this.pilotIdleTween?.stop();
    this.pilotResidentSprite.setScale(PILOT_RESIDENT_SCALE);
    this.pilotIdleTween = this.tweens.add({
      targets: this.pilotResidentSprite,
      y: baseY + 4,
      scaleY: PILOT_RESIDENT_SCALE * 1.01,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  /** Redibuja el residente mostrado. Se llama al crear la escena y tras cada guardado. */
  renderResident(resident: Resident): void {
    this.resident = resident;
    if (
      !this.avatarGraphics ||
      !this.nameText ||
      !this.personalityText ||
      !this.categoryText ||
      !this.needsText
    ) {
      return;
    }

    const centerX = STAGE_CENTER_X;
    const avatarY = STAGE_AVATAR_Y;

    // Tags/categoría/expresión son proyecciones puras de los sliders: se
    // recalculan en cada render, nunca se leen de datos guardados aparte.
    const category = personalityCategory(resident.personality);
    const tags = personalityToTags(resident.personality);
    const expression = personalityExpression(resident.personality);

    this.drawHouse(CATEGORY_ACCENT[category]);

    this.avatarGraphics.clear();
    if (this.pilotResidentSprite && this.textures.exists(PILOT_RESIDENT_TEXTURE_KEY)) {
      this.pilotResidentSprite.setPosition(centerX, avatarY).setVisible(true);
      this.startPilotIdleTween(avatarY);
    } else {
      this.pilotIdleTween?.stop();
      this.pilotResidentSprite?.setVisible(false);
      this.avatarGraphics.fillStyle(colorForAvatar(resident.avatar.color), 1);
      this.avatarGraphics.fillCircle(centerX, avatarY, 60);
      this.avatarGraphics.lineStyle(3, 0xffffff, 0.8);
      this.avatarGraphics.strokeCircle(centerX, avatarY, 60);
    }

    this.nameText
      .setText(resident.name)
      .setColor(EXPRESSION_ACCENT[expression] ?? EXPRESSION_ACCENT.neutral)
      .setPosition(centerX, 436);

    this.categoryText
      .setText(`${category} · ${tags.join(", ")}`)
      .setPosition(centerX, 476);

    const coreNeedsSummary = [
      `Hambre: ${resident.needs.hunger}`,
      `Ánimo: ${resident.needs.mood}`,
      `Energía: ${resident.needs.energy}`,
    ].join("   ·   ");
    this.personalityText.setText(coreNeedsSummary).setPosition(centerX, 508);

    const socialNeedsSummary = [
      `Social: ${resident.needs.social_need}`,
      `Aburrimiento: ${resident.needs.boredom}`,
    ].join("   ·   ");
    this.needsText.setText(socialNeedsSummary).setPosition(centerX, 534);
  }

  showResidentMessage(message: string): void {
    if (!this.reactionText) return;
    this.reactionText.setText(message).setPosition(480, 74).setVisible(true);
  }

  /**
   * Muestra u oculta la burbuja genérica de escena (F3.4). Sustituye a la
   * burbuja de hambre ad-hoc de F2.4: el texto viene de `sceneTextFor` sobre
   * la `SceneIntent` calculada por el Event Engine, nunca de un dato propio.
   */
  showActiveScene(intent: SceneIntent | null, text: string | null): void {
    if (!this.sceneBubbleText) return;
    if (!intent || !text) {
      this.sceneBubbleText.setVisible(false);
      return;
    }
    const label = SCENE_ICONS[intent.sceneType];
    this.sceneBubbleText
      .setText(`${label}\n${text}`)
      .setPosition(STAGE_CENTER_X, STAGE_AVATAR_Y + SCENE_BUBBLE_OFFSET_Y)
      .setVisible(true);
  }

  /**
   * Micro-animación tras resolver una escena (ADR/UX F3.4): salto alegre para
   * hambre/aburrimiento/soledad, asentamiento lento para descanso, giro
   * juguetón para quirks. Pausa el idle tween mientras dura para no chocar.
   */
  showResolutionFeedback(sceneType: SceneType): void {
    const sprite = this.pilotResidentSprite;
    if (!sprite || !sprite.visible) return;

    const baseY = sprite.y;
    this.pilotIdleTween?.pause();
    const resumeIdle = () => this.pilotIdleTween?.resume();

    if (sceneType === "tired") {
      this.tweens.add({
        targets: sprite,
        y: baseY + 10,
        duration: 420,
        ease: "Sine.easeOut",
        yoyo: true,
        onComplete: resumeIdle,
      });
      return;
    }

    if (sceneType === "quirk") {
      this.tweens.add({
        targets: sprite,
        angle: { from: -6, to: 6 },
        duration: 160,
        yoyo: true,
        repeat: 2,
        onComplete: () => {
          sprite.setAngle(0);
          resumeIdle();
        },
      });
      return;
    }

    // hungry / bored / lonely: salto alegre.
    this.tweens.add({
      targets: sprite,
      y: baseY - 18,
      duration: 160,
      yoyo: true,
      ease: "Quad.easeOut",
      onComplete: resumeIdle,
    });
  }
}
