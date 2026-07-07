import type { ResidentId } from "./ids";
import type { Personality } from "./personality";
import type { Needs } from "./needs";
import type { Avatar } from "./avatar";

/** Entidad residente. Ver docs/data_model.md. Tipo puro, sin lógica. */
export interface Resident {
  id: ResidentId;
  name: string;
  avatar: Avatar;
  personality: Personality;
  needs: Needs;
}
