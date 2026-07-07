import Phaser from "phaser";
import type { Resident } from "@/core/resident";
import { PERSONALITY_KEYS, type Personality } from "@/core/personality";
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
};

/**
 * Escena Phaser de Fase 1: muestra un único residente "en su casa" con un
 * placeholder (rectángulo = casa, círculo teñido = avatar) + nombre + resumen
 * de personalidad. Sin isla, sin mapa, sin varios residentes (fases futuras).
 */
export class IslandScene extends Phaser.Scene {
  static readonly KEY = "IslandScene";

  private resident: Resident | null = null;
  private avatarGraphics?: Phaser.GameObjects.Graphics;
  private nameText?: Phaser.GameObjects.Text;
  private personalityText?: Phaser.GameObjects.Text;

  constructor() {
    super(IslandScene.KEY);
  }

  init(data: IslandSceneData): void {
    this.resident = data.resident;
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#1f6f5c");

    // "Casa" placeholder: un rectángulo simple centrado en la escena.
    const house = this.add.graphics();
    house.fillStyle(0x8a5a3b, 1);
    house.fillRoundedRect(150, 90, 500, 340, 16);
    house.lineStyle(4, 0x5c3a24, 1);
    house.strokeRoundedRect(150, 90, 500, 340, 16);

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

    if (this.resident) {
      this.renderResident(this.resident);
    }
  }

  /** Redibuja el residente mostrado. Se llama al crear la escena y tras cada guardado. */
  renderResident(resident: Resident): void {
    this.resident = resident;
    if (!this.avatarGraphics || !this.nameText || !this.personalityText) return;

    const centerX = 400;
    const avatarY = 220;

    this.avatarGraphics.clear();
    this.avatarGraphics.fillStyle(colorForAvatar(resident.avatar.color), 1);
    this.avatarGraphics.fillCircle(centerX, avatarY, 60);
    this.avatarGraphics.lineStyle(3, 0xffffff, 0.8);
    this.avatarGraphics.strokeCircle(centerX, avatarY, 60);

    this.nameText.setText(resident.name).setPosition(centerX, avatarY + 75);

    const summary = PERSONALITY_KEYS.map(
      (key) => `${PERSONALITY_LABELS[key]}: ${resident.personality[key]}`,
    ).join("   ·   ");
    this.personalityText.setText(summary).setPosition(centerX, avatarY + 120);
  }
}
