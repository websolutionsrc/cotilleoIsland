// Bootstrap del juego. Fase 0: placeholder. La lógica de simulación vivirá en
// src/core, src/residents, etc. — desacoplada de Phaser (que solo se usa aquí y en src/ui).
//
// Cuando arranque Fase 1:
//   import Phaser from "phaser";
//   new Phaser.Game({ ... , parent: "game", scene: [BootScene, IslandScene] });

const root = document.querySelector<HTMLDivElement>("#game");
if (root) {
  root.textContent = "Cotilleo Island — Fase 0 (scaffold). Sin juego todavía.";
}

export {};
