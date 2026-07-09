// Bootstrap del juego. Fase 1: crea/carga un residente, lo muestra en una
// escena Phaser y monta el panel de edición en DOM. Phaser solo se usa aquí y
// en src/ui — el resto del código (core/residents/save) es TypeScript puro.
import Phaser from "phaser";
import "@/ui/panel.css";
import type { Resident } from "@/core/resident";
import type { ResidentId } from "@/core/ids";
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

  // Al abrir la isla se aplica decaimiento de necesidades y relaciones (F4) antes de renderizar.
  await saveSystem.applyWorldDecay();

  // Si hay residentes guardados, se muestra el activo (o el primero); si no, se crea uno por defecto.
  let residents = await saveSystem.listResidents();
  let resident: Resident;
  if (residents.length === 0) {
    resident = createResident({ name: "Nuevo residente" });
    await saveSystem.saveResident(resident);
    residents = [resident];
  } else {
    const state = await saveSystem.loadState();
    resident =
      residents.find((candidate) => candidate.id === state.activeResidentId) ?? residents[0]!;
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

  /**
   * Recalcula el estado a mostrar para el residente actualmente enfocado.
   * `computeActiveScenes` elige hasta 3 escenas GLOBALES (F3+F4); con varios
   * residentes, la mejor escena global puede no involucrar al que se esta
   * mostrando ahora mismo - se filtra por participacion antes de usarla, para
   * no mostrar (ni poder resolver) la escena de otro residente por error.
   */
  async function refreshResidentAndScene(): Promise<void> {
    residents = await saveSystem.listResidents();
    resident = residents.find((candidate) => candidate.id === resident.id) ?? residents[0] ?? resident;

    const scenes = await saveSystem.computeActiveScenes();
    activeScene = scenes.find((scene) => scene.participants.includes(resident.id)) ?? null;

    const counterpartId = activeScene?.participants.find((id) => id !== resident.id);
    const counterpart = counterpartId
      ? residents.find((candidate) => candidate.id === counterpartId)
      : undefined;
    activeSceneText = activeScene ? sceneTextFor(activeScene, resident, counterpart) : null;

    const scene = game.scene.getScene(IslandScene.KEY) as IslandScene | null;
    scene?.renderResident(resident);
    scene?.showActiveScene(activeScene, activeSceneText);
    panel?.setResident(resident);
    panel?.setActiveScene(activeScene, activeSceneText);
    panel?.setResidents(residents, resident.id);
  }

  await refreshResidentAndScene();

  const panelContainer = document.querySelector<HTMLDivElement>("#ui-panel");
  if (panelContainer) {
    panel = mountResidentPanel({
      container: panelContainer,
      resident,
      residents,
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
      onCreateResident: async (name) => {
        const created = createResident({ name });
        await saveSystem.saveResident(created);
        await saveSystem.setActiveResident(created.id);
        resident = created;
        await refreshResidentAndScene();
      },
      onSwitchResident: async (id: ResidentId) => {
        const target = residents.find((candidate) => candidate.id === id);
        if (!target) return;
        await saveSystem.setActiveResident(id);
        resident = target;
        await refreshResidentAndScene();
      },
    });
  }
}

void bootstrap();

export {};
