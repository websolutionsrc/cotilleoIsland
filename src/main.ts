// Bootstrap del juego. Fase 1: crea/carga un residente, lo muestra en una
// escena Phaser y monta el panel de edición en DOM. Phaser solo se usa aquí y
// en src/ui — el resto del código (core/residents/save) es TypeScript puro.
import Phaser from "phaser";
import "@/ui/panel.css";
import { IndexedDbStorage } from "@/save/indexeddb-storage";
import { SaveSystem } from "@/save/save-system";
import { createResident } from "@/residents/factory";
import { FOOD_CATALOG } from "@/data/foods";
import { sceneTextFor } from "@/dialogue/scene-texts";
import type { SceneIntent } from "@/events";
import { IslandScene, type IslandSceneData } from "@/ui/island-scene";
import { mountResidentPanel, type ResidentPanel } from "@/ui/resident-panel";

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
    width: 960,
    height: 600,
    backgroundColor: "#0f1720",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  });

  const sceneData: IslandSceneData = { resident };
  game.scene.add(IslandScene.KEY, IslandScene, true, sceneData);

  let panel: ResidentPanel | null = null;
  let activeScene: SceneIntent | null = null;
  let activeSceneText: string | null = null;

  async function refreshResidentAndScene(): Promise<void> {
    const residents = await saveSystem.listResidents();
    resident = residents.find((candidate) => candidate.id === resident.id) ?? residents[0] ?? resident;
    activeScene = (await saveSystem.computeActiveScenes())[0] ?? null;
    activeSceneText = activeScene ? sceneTextFor(activeScene, resident) : null;

    const scene = game.scene.getScene(IslandScene.KEY) as IslandScene | null;
    scene?.renderResident(resident);
    scene?.showActiveScene(activeScene, activeSceneText);
    panel?.setResident(resident);
    panel?.setActiveScene(activeScene, activeSceneText);
  }

  await refreshResidentAndScene();

  const panelContainer = document.querySelector<HTMLDivElement>("#ui-panel");
  if (panelContainer) {
    panel = mountResidentPanel({
      container: panelContainer,
      resident,
      foods: FOOD_CATALOG,
      activeScene,
      activeSceneText,
      onSave: async (updated) => {
        await saveSystem.saveResident(updated);
        resident = updated;
        await refreshResidentAndScene();
      },
      onGiveFood: async (updated, _food, reaction) => {
        await saveSystem.saveResident(updated);
        resident = updated;
        await refreshResidentAndScene();
        const scene = game.scene.getScene(IslandScene.KEY) as IslandScene | null;
        scene?.showResidentMessage(reaction);
      },
      onResolveScene: async (intent, action) => {
        const nextState = await saveSystem.resolveScene(intent, action);
        resident = nextState.residents.find((candidate) => candidate.id === resident.id) ?? resident;
        await refreshResidentAndScene();
        const scene = game.scene.getScene(IslandScene.KEY) as IslandScene | null;
        scene?.showResolutionFeedback(intent.sceneType);
      },
    });
  }
}

void bootstrap();

export {};
