import Phaser from "phaser";
import type { Resident } from "@/core/resident";
import { PERSONALITY_KEYS, type Personality } from "@/core/personality";
import {
  personalityCategory,
  personalityExpression,
  personalityToTags,
  type PersonalityCategory,
} from "@/core/personality-derived";
import { colorForAvatar } from "./avatar-palette";

export interface IslandSceneData {
  resident: Resident;
}

const PERSONALITY_LABELS: Record<keyof Personality, string> = {
  energy: "Energía",
  sociability: "Sociabilidad",
  patience: "Paciencia",
  weirdness: "Rareza",
  romanticism: "Romanticismo",
  kindness: "Amabilidad",
};

/**
 * Colores de acento puramente decorativos (placeholder), uno por categoría
 * derivada (`personalityCategory`). Solo afectan al trazo de la "casa"; no son
 * dato de dominio ni se guardan — se recalculan siempre desde la personalidad.
 */
const CATEGORY_ACCENT: Record<PersonalityCategory, number> = {
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
  private nameText?: Phaser.GameObjects.Text;
  private personalityText?: Phaser.GameObjects.Text;
  private categoryText?: Phaser.GameObjects.Text;

  constructor() {
    super(IslandScene.KEY);
  }

  init(data: IslandSceneData): void {
    this.resident = data.resident;
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#1f6f5c");

    this.houseGraphics = this.add.graphics();
    this.drawHouse(0x5c3a24);

    this.avatarGraphics = this.add.graphics();
    this.nameText = this.add
      .text(0, 0, "", { fontFamily: "sans-serif", fontSize: "28px", color: "#ffffff" })
      .setOrigin(0.5, 0);
    this.personalityText = this.add
      .text(0, 0, "", {
        fontFamily: "sans-serif",
        fontSize: "15px",
        color: "#eaeaea",
        align: "center",
        wordWrap: { width: 460 },
      })
      .setOrigin(0.5, 0);
    this.categoryText = this.add
      .text(0, 0, "", {
        fontFamily: "sans-serif",
        fontSize: "16px",
        fontStyle: "italic",
        color: "#ffffff",
        align: "center",
        wordWrap: { width: 460 },
      })
      .setOrigin(0.5, 0);

    if (this.resident) {
      this.renderResident(this.resident);
    }
  }

  /** "Casa" placeholder: un rectángulo centrado, con el trazo teñido por categoría. */
  private drawHouse(strokeColor: number): void {
    if (!this.houseGraphics) return;
    this.houseGraphics.clear();
    this.houseGraphics.fillStyle(0x8a5a3b, 1);
    this.houseGraphics.fillRoundedRect(150, 90, 500, 340, 16);
    this.houseGraphics.lineStyle(4, strokeColor, 1);
    this.houseGraphics.strokeRoundedRect(150, 90, 500, 340, 16);
  }

  /** Redibuja el residente mostrado. Se llama al crear la escena y tras cada guardado. */
  renderResident(resident: Resident): void {
    this.resident = resident;
    if (
      !this.avatarGraphics ||
      !this.nameText ||
      !this.personalityText ||
      !this.categoryText
    ) {
      return;
    }

    const centerX = 400;
    const avatarY = 220;

    // Tags/categoría/expresión son proyecciones puras de los sliders: se
    // recalculan en cada render, nunca se leen de datos guardados aparte.
    const category = personalityCategory(resident.personality);
    const tags = personalityToTags(resident.personality);
    const expression = personalityExpression(resident.personality);

    this.drawHouse(CATEGORY_ACCENT[category]);

    this.avatarGraphics.clear();
    this.avatarGraphics.fillStyle(colorForAvatar(resident.avatar.color), 1);
    this.avatarGraphics.fillCircle(centerX, avatarY, 60);
    this.avatarGraphics.lineStyle(3, 0xffffff, 0.8);
    this.avatarGraphics.strokeCircle(centerX, avatarY, 60);

    this.nameText
      .setText(resident.name)
      .setColor(EXPRESSION_ACCENT[expression] ?? EXPRESSION_ACCENT.neutral)
      .setPosition(centerX, avatarY + 75);

    this.categoryText
      .setText(`${category} · ${tags.join(", ")}`)
      .setPosition(centerX, avatarY + 112);

    const summary = PERSONALITY_KEYS.map(
      (key) => `${PERSONALITY_LABELS[key]}: ${resident.personality[key]}`,
    ).join("   ·   ");
    this.personalityText.setText(summary).setPosition(centerX, avatarY + 142);
  }
}
