import type { Resident } from "@/core/resident";
import { PERSONALITY_KEYS, type Personality } from "@/core/personality";
import { updateResident, ResidentValidationError } from "@/residents/factory";

export interface ResidentPanelOptions {
  container: HTMLElement;
  resident: Resident;
  /** Llamado con el residente ya validado, tras pulsar "Guardar". */
  onSave: (updated: Resident) => Promise<void> | void;
}

export interface ResidentPanel {
  /** Sincroniza los campos del panel con un residente externo (p.ej. tras cargar). */
  setResident(resident: Resident): void;
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
  const { container, onSave } = options;
  let current = options.resident;

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

  function syncInputs(resident: Resident): void {
    nameInput.value = resident.name;
    for (const key of PERSONALITY_KEYS) {
      const value = String(resident.personality[key]);
      sliders[key].value = value;
      sliderValueLabels[key].textContent = value;
    }
    errorBox.textContent = "";
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

  syncInputs(current);

  return {
    setResident(resident: Resident) {
      current = resident;
      syncInputs(resident);
    },
  };
}
