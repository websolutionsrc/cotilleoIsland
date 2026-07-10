# ADR 0001 - Web/PWA stack (TypeScript + Phaser), not Unity

- **Status:** accepted
- **Date:** 2026-07-07
- **Supersedes:** the initial Unity+C# proposal (rejected).

## Context
Casual 2D game in the Tomodachi style, targeting iPad, with **no Mac available**.
Building an iOS app with Unity/Swift requires macOS+Xcode or Unity Build Automation
(paid, plus an Apple Developer account). In other words, the biggest blocker (no Mac)
directly affects Unity's iPad-native side, which was its main advantage here.

## Decision
Build the game as a **web app (PWA)** with **TypeScript + Vite + Phaser 3**, using local
persistence in **IndexedDB**, installable on iPad via "Add to home screen".

## Reasons
- Reaches iPad **without a Mac, Xcode, or paid cloud build**.
- Very fast iteration; validate on desktop and Safari iPad with the same build.
- Tomodachi is UI + 2D scenes (not demanding action/physics): the web is more than sufficient.
- Exit path to the App Store if needed: wrap with Capacitor/PWABuilder.

## Alternatives considered
- **Unity + Build Automation**: real native app, but expensive/slow and introduces signing/Apple account friction at the blocked point.
- **Godot**: free and exports, but has the same iOS signing problem without a Mac.

## Consequences
- Simulation **pure logic** decoupled from Phaser (testable, portable).
- Monitor storage quota and performance in Safari iPad; use `navigator.storage.persist()`
  and manual export/import as a safety net.
- App Store distribution is **postponed** (see `distribution_strategy.md`).
