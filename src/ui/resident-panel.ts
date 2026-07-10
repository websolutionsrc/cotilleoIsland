import type { Resident } from "@/core/resident";
import type { ResidentId } from "@/core/ids";
import { PERSONALITY_KEYS, type Personality } from "@/core/personality";
import { applyFoodEffect, needsToStatus } from "@/core/needs";
import { pantryQuantity, type PantryEntry } from "@/core/pantry";
import type { FoodItem } from "@/data/foods";
import { foodReactionFor } from "@/dialogue/food-reactions";
import { isSocialSceneType, type SceneIntent, type SceneResolutionAction } from "@/events";
import { updateResident, ResidentValidationError } from "@/residents/factory";

export interface ResidentPanelOptions {
  container: HTMLElement;
  resident: Resident;
  /** F4.4: lista completa para el selector. Si falta, se asume solo `resident`. */
  residents?: readonly Resident[];
  foods?: readonly FoodItem[];
  activeScene?: SceneIntent | null;
  activeSceneText?: string | null;
  /** F5.4: monedas del jugador. */
  wallet?: { coins: number };
  /** F5.4: despensa actual (stock disponible por comida). */
  pantry?: readonly PantryEntry[];
  /** Llamado con el residente ya validado, tras pulsar "Guardar". */
  onSave: (updated: Resident) => Promise<void> | void;
  /** F5.4: da una unidad de `food` (de la despensa) al residente activo. `reaction` es texto ya generado, para mostrar en otros sitios (p.ej. la burbuja de Phaser). */
  onGiveFood?: (food: FoodItem, reaction: string) => Promise<void> | void;
  /**
   * Called when the current scene is resolved. `action` is omitted for
   * social scenes (F4): resuelven sin elegir sub-accion (ver SaveSystem.resolveScene).
   */
  onResolveScene?: (intent: SceneIntent, action?: SceneResolutionAction) => Promise<void> | void;
  /** F4.4: crea un residente nuevo con el nombre dado y lo hace el activo. */
  onCreateResident?: (name: string) => Promise<void> | void;
  /** F4.4: cambia cual residente se muestra/edita en el panel y la escena. */
  onSwitchResident?: (id: ResidentId) => Promise<void> | void;
  /** F5.4: compra 1 unidad de `foodId` con monedas. */
  onBuyFood?: (foodId: string) => Promise<void> | void;
}

export interface ResidentPanel {
  /** Sincroniza los campos del panel con un residente externo (p.ej. tras cargar). */
  setResident(resident: Resident): void;
  /** Updates the active F3 scene shown in the panel. */
  setActiveScene(intent: SceneIntent | null, text?: string | null): void;
  /** F4.4: refresca el selector tras crear/cambiar de residente. */
  setResidents(residents: readonly Resident[], activeId: ResidentId): void;
  /** F5.4: refresca monedas + despensa (p.ej. tras comprar/dar comida/resolver una escena). */
  setEconomy(wallet: { coins: number }, pantry: readonly PantryEntry[]): void;
  /** F5.4: muestra un mensaje de feedback (reaccion o recompensa) bajo la escena. */
  setReaction(text: string): void;
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
  const { container, foods = [], onGiveFood, onResolveScene, onSave, onCreateResident, onSwitchResident, onBuyFood } =
    options;
  let current = options.resident;
  let activeScene = options.activeScene ?? null;
  let activeSceneText = options.activeSceneText ?? null;
  let wallet = options.wallet ?? { coins: 0 };
  let pantry = options.pantry ?? [];

  container.innerHTML = "";
  container.classList.add("resident-panel");

  const title = document.createElement("h2");
  title.textContent = "Tu residente";
  container.appendChild(title);

  const walletBox = document.createElement("p");
  walletBox.className = "resident-panel__wallet";
  container.appendChild(walletBox);

  const residentsTitle = document.createElement("h3");
  residentsTitle.textContent = "Residentes";
  container.appendChild(residentsTitle);

  const residentSelect = document.createElement("select");
  residentSelect.id = "resident-switcher";
  residentSelect.setAttribute("aria-label", "Cambiar de residente");
  container.appendChild(residentSelect);

  const newResidentRow = document.createElement("div");
  newResidentRow.className = "resident-panel__row";
  const newResidentNameInput = document.createElement("input");
  newResidentNameInput.type = "text";
  newResidentNameInput.placeholder = "Nombre del nuevo residente";
  newResidentNameInput.maxLength = 40;
  const createResidentButton = document.createElement("button");
  createResidentButton.type = "button";
  createResidentButton.textContent = "Crear residente";
  createResidentButton.disabled = onCreateResident === undefined;
  newResidentRow.append(newResidentNameInput, createResidentButton);
  container.appendChild(newResidentRow);

  function renderResidentOptions(residents: readonly Resident[], activeId: ResidentId): void {
    residentSelect.innerHTML = "";
    for (const candidate of residents) {
      const option = document.createElement("option");
      option.value = candidate.id;
      option.textContent = candidate.name;
      option.selected = candidate.id === activeId;
      residentSelect.appendChild(option);
    }
    residentSelect.disabled = residents.length <= 1 || onSwitchResident === undefined;
  }

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

  const pantryTitle = document.createElement("h3");
  pantryTitle.textContent = "Despensa";
  container.appendChild(pantryTitle);

  const foodLabel = document.createElement("label");
  foodLabel.textContent = "Comida";
  foodLabel.htmlFor = "resident-food-select";
  const foodSelect = document.createElement("select");
  foodSelect.id = "resident-food-select";
  for (const food of foods) {
    const option = document.createElement("option");
    option.value = food.id;
    foodSelect.appendChild(option);
  }
  container.append(foodLabel, foodSelect);

  const giveFoodButton = document.createElement("button");
  giveFoodButton.type = "button";
  giveFoodButton.textContent = "Dar comida";
  container.appendChild(giveFoodButton);

  const shopTitle = document.createElement("h3");
  shopTitle.textContent = "Tienda";
  container.appendChild(shopTitle);

  const shopList = document.createElement("div");
  shopList.className = "resident-panel__shop";
  container.appendChild(shopList);

  const shopRows = new Map<string, { row: HTMLDivElement; label: HTMLSpanElement; button: HTMLButtonElement }>();
  for (const food of foods) {
    const row = document.createElement("div");
    row.className = "resident-panel__row resident-panel__shop-row";

    const label = document.createElement("span");
    label.className = "resident-panel__shop-label";

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `Comprar (${food.price})`;
    button.addEventListener("click", () => {
      if (!onBuyFood) return;
      void onBuyFood(food.id);
    });

    row.append(label, button);
    shopList.appendChild(row);
    shopRows.set(food.id, { row, label, button });
  }

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
    celebrate: "Celebrar",
  };

  function actionForActiveScene(): SceneResolutionAction | null {
    if (!activeScene) return null;
    switch (activeScene.sceneType) {
      case "hungry": {
        const selectedFood = foods.find((food) => food.id === foodSelect.value);
        if (!selectedFood || pantryQuantity(pantry, selectedFood.id) <= 0) return null;
        return { kind: "give_food", foodEffect: selectedFood, foodId: selectedFood.id };
      }
      case "tired":
        return { kind: "rest" };
      case "bored":
        return { kind: "play" };
      case "lonely":
        return { kind: "chat" };
      case "quirk":
        return { kind: "observe" };
      case "zone_opening":
        return { kind: "celebrate" };
      default:
        // Escenas sociales (F4): resuelven de forma determinista sin elegir
        // SceneResolutionAction; F4.4 les dara su propio boton/flujo de UI.
        return null;
    }
  }

  function actionLabelForActiveScene(): string {
    if (activeScene && isSocialSceneType(activeScene.sceneType)) return "Resolver";
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
    // Las escenas sociales (F4) no eligen SceneResolutionAction: resolver ES la accion.
    const social = isSocialSceneType(activeScene.sceneType);
    resolveSceneButton.disabled = onResolveScene === undefined || (!social && actionForActiveScene() === null);
  }

  /** F5.4: la comida deja de ser gratis - dar/vincular a una escena de hambre requiere stock real en la despensa. */
  function syncPantryUi(): void {
    walletBox.textContent = `Monedas: ${wallet.coins}`;

    for (const food of foods) {
      const qty = pantryQuantity(pantry, food.id);
      const option = [...foodSelect.options].find((candidate) => candidate.value === food.id);
      if (option) option.textContent = `${food.name} (x${qty})`;

      const shopRow = shopRows.get(food.id);
      if (shopRow) {
        shopRow.label.textContent = `${food.name} - x${qty} en despensa`;
        shopRow.button.disabled = onBuyFood === undefined || wallet.coins < food.price;
      }
    }

    const selectedFood = foods.find((food) => food.id === foodSelect.value);
    const selectedQty = selectedFood ? pantryQuantity(pantry, selectedFood.id) : 0;
    giveFoodButton.disabled = !selectedFood || selectedQty <= 0 || onGiveFood === undefined;
    syncScene();
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
    syncPantryUi();
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
    if (!selectedFood || !onGiveFood || pantryQuantity(pantry, selectedFood.id) <= 0) return;

    const previewNeeds = applyFoodEffect(current.needs, selectedFood);
    const reaction = foodReactionFor({
      resident: current,
      food: selectedFood,
      beforeNeeds: current.needs,
      afterNeeds: previewNeeds,
    });
    reactionBox.textContent = reaction;
    void onGiveFood(selectedFood, reaction);
  });

  foodSelect.addEventListener("change", syncPantryUi);

  resolveSceneButton.addEventListener("click", () => {
    if (!activeScene || !onResolveScene) return;
    if (isSocialSceneType(activeScene.sceneType)) {
      void onResolveScene(activeScene);
      return;
    }
    const action = actionForActiveScene();
    if (!action) return;
    void onResolveScene(activeScene, action);
  });

  residentSelect.addEventListener("change", () => {
    if (!onSwitchResident) return;
    void onSwitchResident(residentSelect.value as ResidentId);
  });

  createResidentButton.addEventListener("click", () => {
    if (!onCreateResident) return;
    const name = newResidentNameInput.value.trim();
    if (!name) return;
    void onCreateResident(name);
    newResidentNameInput.value = "";
  });

  syncInputs(current);
  renderResidentOptions(options.residents ?? [current], current.id);

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
    setResidents(residents: readonly Resident[], activeId: ResidentId) {
      renderResidentOptions(residents, activeId);
    },
    setEconomy(nextWallet: { coins: number }, nextPantry: readonly PantryEntry[]) {
      wallet = nextWallet;
      pantry = nextPantry;
      syncPantryUi();
    },
    setReaction(text: string) {
      reactionBox.textContent = text;
    },
  };
}
