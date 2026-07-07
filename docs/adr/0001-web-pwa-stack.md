# ADR 0001 — Stack web/PWA (TypeScript + Phaser), no Unity

- **Estado:** aceptada
- **Fecha:** 2026-07-07
- **Sustituye a:** la propuesta inicial de usar Unity+C# (descartada).

## Contexto
Juego 2D casual tipo Tomodachi, target iPad, **sin Mac disponible**. Compilar una app
iOS con Unity/Swift requiere macOS+Xcode o Unity Build Automation (de pago, + cuenta
Apple Developer). Es decir: el mayor bloqueo (no-Mac) golpea justo la parte iPad-nativa
de Unity, que era su principal ventaja aquí.

## Decisión
Construir el juego como **web app (PWA)** con **TypeScript + Vite + Phaser 3**,
persistencia local en **IndexedDB**, instalable en el iPad vía "Añadir a pantalla de inicio".

## Motivos
- Llega al iPad **sin Mac, sin Xcode y sin build cloud de pago**.
- Iteración muy rápida; validar en escritorio y en Safari iPad con el mismo build.
- Tomodachi es UI + escenas 2D (no acción/física exigente): la web cubre de sobra.
- Camino de salida a App Store si hiciera falta: envolver con Capacitor/PWABuilder.

## Alternativas consideradas
- **Unity + Build Automation**: app nativa real, pero caro/lento y con la fricción de
  firma/cuenta Apple justo en el punto bloqueado.
- **Godot**: gratis y exporta, pero mismo problema de firma iOS sin Mac.

## Consecuencias
- Lógica de simulación **pura** y desacoplada de Phaser (testeable, portable).
- Vigilar cuota de almacenamiento y rendimiento en Safari iPad; usar
  `navigator.storage.persist()` y export/import manual como red de seguridad.
- La distribución en App Store queda **aplazada** (ver `distribution_strategy.md`).
