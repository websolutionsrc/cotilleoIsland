// Bootstrap del juego. Fase 1: crea/carga un residente, lo muestra en una
// escena Phaser y monta el panel de edición en DOM. Phaser solo se usa aquí y
// en src/ui — el resto del código (core/residents/save) es TypeScript puro.
import Phaser from "phaser";
import "@/ui/panel.css";
import { IndexedDbStorage } from "@/save/indexeddb-storage";
import { SaveSystem } from "@/save/save-system";
import { createResident } from "@/residents/factory";
import { FOOD_CATALOG } from "@/data/foods";
import { IslandScene, type IslandSceneData } from "@/ui/island-scene";
import { mountResidentPanel } from "@/ui/resident-panel";

async function bootstrap(): Promise<void> {
  const storage = new IndexedDbStorage();
  const saveSystem = new SaveSystem(storage);

  // Al abrir la isla se aplica decaimiento de necesidades antes de renderizar.
  await saveSystem.applyNeedsDecay();

  // Si hay un residente guardado, se carga; si no, se crea uno por defecto.
  const residents = await saveSystem.listResidents();
  let resident = residents[0];
  if (!resident) {
    resident = createResident({ name: "Nuevo residente" });
    await saveSystem.saveResident(resident);
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    width: 800,
    height: 480,
    backgroundColor: "#0f1720",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  });

  const sceneData: IslandSceneData = { resident };
  game.scene.add(IslandScene.KEY, IslandScene, true, sceneData);

  const panelContainer = document.querySelector<HTMLDivElement>("#ui-panel");
  if (panelContainer) {
    mountResidentPanel({
      container: panelContainer,
      resident,
      foods: FOOD_CATALOG,
      onSave: async (updated) => {
        await saveSystem.saveResident(updated);
        const scene = game.scene.getScene(IslandScene.KEY) as IslandScene | null;
        scene?.renderResident(updated);
      },
      onGiveFood: async (updated) => {
        await saveSystem.saveResident(updated);
        const scene = game.scene.getScene(IslandScene.KEY) as IslandScene | null;
        scene?.renderResident(updated);
      },
    });
  }
}

void bootstrap();

export {};
