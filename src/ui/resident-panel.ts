import type { Resident } from "@/core/resident";
import { PERSONALITY_KEYS, type Personality } from "@/core/personality";
import { applyFoodEffect, needsToStatus } from "@/core/needs";
import type { FoodItem } from "@/data/foods";
import { foodReactionFor } from "@/dialogue/food-reactions";
import type { SceneIntent, SceneResolutionAction } from "@/events";
import { updateResident, ResidentValidationError } from "@/residents/factory";

export interface ResidentPanelOptions {
  container: HTMLElement;
  resident: Resident;
  foods?: readonly FoodItem[];
  activeScene?: SceneIntent | null;
  activeSceneText?: string | null;
  /** Llamado con el residente ya validado, tras pulsar "Guardar". */
  onSave: (updated: Resident) => Promise<void> | void;
  /** Llamado con el residente actualizado tras darle comida. */
  onGiveFood?: (updated: Resident, food: FoodItem, reaction: string) => Promise<void> | void;
  /** Called when the current F3 scene is resolved. */
  onResolveScene?: (intent: SceneIntent, action: SceneResolutionAction) => Promise<void> | void;
}

export interface ResidentPanel {
  /** Sincroniza los campos del panel con un residente externo (p.ej. tras cargar). */
  setResident(resident: Resident): void;
  /** Updates the active F3 scene shown in the panel. */
  setActiveScene(intent: SceneIntent | null, text?: string | null): void;
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
 * Monta un panel de edición (overlay DOM sobre el canvas de Phaser) para
 * editar el nombre y la personalidad del residente actual. Toda la
 * validación se delega en `residents/factory` (updateResident); este módulo
 * solo construye el DOM y traduce eventos de input a llamadas de dominio.
 */
export function mountResidentPanel(options: ResidentPanelOptions): ResidentPanel {
  const { container, foods = [], onGiveFood, onResolveScene, onSave } = options;
  let current = options.resident;
  let activeScene = options.activeScene ?? null;
  let activeSceneText = options.activeSceneText ?? null;

  container.innerHTML = "";
  container.classList.add("resident-panel");

  const title = document.createElement("h2");
  title.textContent = "Tu residente";
  container.appendChild(title);

  const nameLabel = document.createElement("label");
  nameLabel.textContent = "Nombre";
  nameLabel.htmlFor = "resident-name-input";
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.id = "resident-name-input";
  nameInput.maxLength = 40;
  container.append(nameLabel, nameInput);

  const sliders = {} as Record<keyof Personality, HTMLInputElement>;
  const sliderValueLabels = {} as Record<keyof Personality, HTMLSpanElement>;

  for (const key of PERSONALITY_KEYS) {
    const row = document.createElement("div");
    row.className = "resident-panel__row";

    const label = document.createElement("label");
    label.textContent = PERSONALITY_LABELS[key];
    label.htmlFor = `resident-${key}-input`;

    const input = document.createElement("input");
    input.type = "range";
    input.min = "0";
    input.max = "100";
    input.step = "1";
    input.id = `resident-${key}-input`;

    const valueLabel = document.createElement("span");
    valueLabel.className = "resident-panel__value";
    input.addEventListener("input", () => {
      valueLabel.textContent = input.value;
    });

    row.append(label, input, valueLabel);
    container.appendChild(row);

    sliders[key] = input;
    sliderValueLabels[key] = valueLabel;
  }

  const errorBox = document.createElement("p");
  errorBox.className = "resident-panel__error";
  container.appendChild(errorBox);

  const saveButton = document.createElement("button");
  saveButton.type = "button";
  saveButton.textContent = "Guardar";
  container.appendChild(saveButton);

  const needsTitle = document.createElement("h3");
  needsTitle.textContent = "Necesidades";
  container.appendChild(needsTitle);

  const needsSummary = document.createElement("p");
  needsSummary.className = "resident-panel__needs";
  container.appendChild(needsSummary);

  const foodLabel = document.createElement("label");
  foodLabel.textContent = "Comida";
  foodLabel.htmlFor = "resident-food-select";
  const foodSelect = document.createElement("select");
  foodSelect.id = "resident-food-select";
  for (const food of foods) {
    const option = document.createElement("option");
    option.value = food.id;
    option.textContent = food.name;
    foodSelect.appendChild(option);
  }
  container.append(foodLabel, foodSelect);

  const giveFoodButton = document.createElement("button");
  giveFoodButton.type = "button";
  giveFoodButton.textContent = "Dar comida";
  giveFoodButton.disabled = foods.length === 0 || onGiveFood === undefined;
  container.appendChild(giveFoodButton);

  const sceneTitle = document.createElement("h3");
  sceneTitle.textContent = "Escena activa";
  container.appendChild(sceneTitle);

  const sceneBox = document.createElement("p");
  sceneBox.className = "resident-panel__scene";
  container.appendChild(sceneBox);

  const resolveSceneButton = document.createElement("button");
  resolveSceneButton.type = "button";
  container.appendChild(resolveSceneButton);

  const reactionBox = document.createElement("p");
  reactionBox.className = "resident-panel__reaction";
  container.appendChild(reactionBox);

  const ACTION_LABELS: Record<Exclude<SceneResolutionAction["kind"], "give_food">, string> = {
    rest: "Dejar descansar",
    play: "Jugar un rato",
    chat: "Charlar",
    observe: "Observar",
  };

  function actionForActiveScene(): SceneResolutionAction | null {
    if (!activeScene) return null;
    switch (activeScene.sceneType) {
      case "hungry": {
        const selectedFood = foods.find((food) => food.id === foodSelect.value);
        return selectedFood ? { kind: "give_food", foodEffect: selectedFood } : null;
      }
      case "tired":
        return { kind: "rest" };
      case "bored":
        return { kind: "play" };
      case "lonely":
        return { kind: "chat" };
      case "quirk":
        return { kind: "observe" };
    }
  }

  function actionLabelForActiveScene(): string {
    const action = actionForActiveScene();
    if (!action) return "Resolver escena";
    if (action.kind === "give_food") return "Dar comida";
    return ACTION_LABELS[action.kind];
  }

  function syncScene(): void {
    if (!activeScene) {
      sceneBox.textContent = "No hay escenas activas ahora mismo.";
      resolveSceneButton.textContent = "Sin escena";
      resolveSceneButton.disabled = true;
      return;
    }

    sceneBox.textContent = activeSceneText ?? "Mara quiere hacer algo.";
    resolveSceneButton.textContent = actionLabelForActiveScene();
    resolveSceneButton.disabled = onResolveScene === undefined || actionForActiveScene() === null;
  }

  function syncInputs(resident: Resident): void {
    nameInput.value = resident.name;
    for (const key of PERSONALITY_KEYS) {
      const value = String(resident.personality[key]);
      sliders[key].value = value;
      sliderValueLabels[key].textContent = value;
    }
    const status = needsToStatus(resident.needs);
    const hungerLabel = status.urgentlyNeedsFood
      ? "hambre urgente"
      : status.wantsFood
        ? "tiene hambre"
        : "sin hambre";
    const moodLabel = status.lowMood ? "ánimo bajo" : "ánimo estable";
    needsSummary.textContent = `Hambre ${resident.needs.hunger}/100 (${hungerLabel}) · Ánimo ${resident.needs.mood}/100 (${moodLabel})`;
    errorBox.textContent = "";
    syncScene();
  }

  saveButton.addEventListener("click", () => {
    const personalityChanges: Partial<Personality> = {};
    for (const key of PERSONALITY_KEYS) {
      personalityChanges[key] = Number(sliders[key].value);
    }

    try {
      const updated = updateResident(current, {
        name: nameInput.value,
        personality: personalityChanges,
      });
      current = updated;
      syncInputs(current);
      errorBox.textContent = "";
      void onSave(updated);
    } catch (err) {
      if (err instanceof ResidentValidationError) {
        errorBox.textContent = err.errors.join(" ");
      } else {
        errorBox.textContent = "Error inesperado al guardar.";
        throw err;
      }
    }
  });

  giveFoodButton.addEventListener("click", () => {
    const selectedFood = foods.find((food) => food.id === foodSelect.value);
    if (!selectedFood || !onGiveFood) return;

    const updated: Resident = {
      ...current,
      needs: applyFoodEffect(current.needs, selectedFood),
    };
    const reaction = foodReactionFor({
      resident: current,
      food: selectedFood,
      beforeNeeds: current.needs,
      afterNeeds: updated.needs,
    });
    current = updated;
    syncInputs(current);
    reactionBox.textContent = reaction;
    void onGiveFood(updated, selectedFood, reaction);
  });

  foodSelect.addEventListener("change", syncScene);

  resolveSceneButton.addEventListener("click", () => {
    if (!activeScene || !onResolveScene) return;
    const action = actionForActiveScene();
    if (!action) return;
    void onResolveScene(activeScene, action);
  });

  syncInputs(current);
  syncScene();

  return {
    setResident(resident: Resident) {
      current = resident;
      syncInputs(resident);
      reactionBox.textContent = "";
    },
    setActiveScene(intent: SceneIntent | null, text?: string | null) {
      activeScene = intent;
      activeSceneText = text ?? null;
      syncScene();
    },
  };
}
