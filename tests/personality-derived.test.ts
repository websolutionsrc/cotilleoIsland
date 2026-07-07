import { describe, expect, it } from "vitest";
import {
  personalityToTags,
  personalityCategory,
  personalityExpression,
} from "@/core/personality-derived";
import { DEFAULT_PERSONALITY, type Personality } from "@/core/personality";

function withTraits(overrides: Partial<Personality>): Personality {
  return { ...DEFAULT_PERSONALITY, ...overrides };
}

describe("personalityToTags", () => {
  it("devuelve ['equilibrada'] cuando ningún rasgo es extremo", () => {
    expect(personalityToTags(DEFAULT_PERSONALITY)).toEqual(["equilibrada"]);
    // Justo dentro de banda (no extremo): 69 y 31.
    expect(
      personalityToTags(withTraits({ energy: 69, sociability: 31 })),
    ).toEqual(["equilibrada"]);
  });

  it("etiqueta un único rasgo extremo alto", () => {
    expect(personalityToTags(withTraits({ energy: 70 }))).toEqual(["enérgica"]);
  });

  it("etiqueta un único rasgo extremo bajo", () => {
    expect(personalityToTags(withTraits({ patience: 30 }))).toEqual(["impaciente"]);
  });

  it("cubre las 6 etiquetas altas y las 5 bajas (menos romanticism)", () => {
    expect(personalityToTags(withTraits({ sociability: 80 }))).toEqual(["sociable"]);
    expect(personalityToTags(withTraits({ sociability: 10 }))).toEqual(["reservada"]);
    expect(personalityToTags(withTraits({ weirdness: 90 }))).toEqual(["excéntrica"]);
    expect(personalityToTags(withTraits({ weirdness: 5 }))).toEqual(["convencional"]);
    expect(personalityToTags(withTraits({ romanticism: 95 }))).toEqual(["romántica"]);
    expect(personalityToTags(withTraits({ kindness: 100 }))).toEqual(["amable"]);
    expect(personalityToTags(withTraits({ kindness: 0 }))).toEqual(["borde"]);
  });

  it("romanticism bajo no genera ninguna tag propia", () => {
    // romanticism=10 es extremo bajo pero no tiene tag; con todo lo demás
    // equilibrado, el resultado cae de nuevo a "equilibrada".
    expect(personalityToTags(withTraits({ romanticism: 10 }))).toEqual(["equilibrada"]);
  });

  it("ordena hasta 3 tags por extremidad (mayor distancia a 50 primero)", () => {
    const p = withTraits({ kindness: 100, energy: 80, sociability: 71 });
    // distancias: kindness=50, energy=30, sociability=21
    expect(personalityToTags(p)).toEqual(["amable", "enérgica", "sociable"]);
  });

  it("limita a un máximo de 3 tags aunque más de 3 rasgos sean extremos", () => {
    const p = withTraits({
      energy: 100,
      sociability: 90,
      patience: 0,
      weirdness: 80,
    });
    expect(personalityToTags(p)).toHaveLength(3);
    // energy(50) > patience(50) por orden fijo de PERSONALITY_KEYS > sociability(40) > weirdness(30)
    expect(personalityToTags(p)).toEqual(["enérgica", "impaciente", "sociable"]);
  });

  it("desempata por el orden fijo de PERSONALITY_KEYS cuando la distancia es idéntica", () => {
    // energy y sociability ambos a distancia 20 (valor 70): energy va primero
    // porque aparece antes en PERSONALITY_KEYS.
    const p = withTraits({ energy: 70, sociability: 70 });
    expect(personalityToTags(p)).toEqual(["enérgica", "sociable"]);
  });
});

describe("personalityCategory", () => {
  it("clasifica como Sociable con alta sociabilidad y energía", () => {
    expect(personalityCategory(withTraits({ sociability: 90, energy: 90 }))).toBe("Sociable");
  });

  it("clasifica como Reservada con baja sociabilidad", () => {
    expect(personalityCategory(withTraits({ sociability: 5 }))).toBe("Reservada");
  });

  it("clasifica como Cariñosa con alta amabilidad y paciencia", () => {
    expect(personalityCategory(withTraits({ kindness: 95, patience: 95 }))).toBe("Cariñosa");
  });

  it("clasifica como Excéntrica con alta rareza", () => {
    expect(personalityCategory(withTraits({ weirdness: 100 }))).toBe("Excéntrica");
  });

  it("clasifica como Equilibrada un perfil neutro (sin rasgos extremos)", () => {
    // Todo 50: ningún rasgo es extremo -> Equilibrada (no cae en "Sociable").
    expect(personalityCategory(DEFAULT_PERSONALITY)).toBe("Equilibrada");
    // Perfil suave pero sin extremos (65/60): sigue siendo Equilibrada.
    expect(personalityCategory(withTraits({ sociability: 65, energy: 60 }))).toBe("Equilibrada");
  });

  it("con al menos un rasgo extremo, deja de ser Equilibrada", () => {
    // energy=70 es extremo -> se evalúan las familias por score (Sociable gana).
    expect(personalityCategory(withTraits({ energy: 70 }))).toBe("Sociable");
  });
});

describe("personalityExpression", () => {
  it("devuelve 'animada' si energy es alto (máxima prioridad)", () => {
    expect(personalityExpression(withTraits({ energy: 100, kindness: 100 }))).toBe("animada");
  });

  it("devuelve 'sonriente' si kindness es alto y energy no", () => {
    expect(personalityExpression(withTraits({ kindness: 90 }))).toBe("sonriente");
  });

  it("devuelve 'seria' si patience es bajo y no aplican las anteriores", () => {
    expect(personalityExpression(withTraits({ patience: 10 }))).toBe("seria");
  });

  it("devuelve 'peculiar' si weirdness es alto y no aplican las anteriores", () => {
    expect(personalityExpression(withTraits({ weirdness: 90 }))).toBe("peculiar");
  });

  it("devuelve 'neutral' si ningún rasgo dominante aplica", () => {
    expect(personalityExpression(DEFAULT_PERSONALITY)).toBe("neutral");
  });
});
