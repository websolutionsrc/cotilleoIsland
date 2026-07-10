# Estrategia de distribución — Cotilleo Island (web/PWA)

## Estado (F7)
- **[DONE]** Manifest válido servido en build de producción, service worker
  activo (`npm run preview`, verificado en el navegador). Iconos placeholder
  generados (`tools/icon-gen/`, ver nota abajo) para `manifest.webmanifest`
  (192/512) y `apple-touch-icon` (180, requerido aparte por iOS Safari - no
  lee los iconos del manifest para "Añadir a pantalla de inicio").
- **[DONE]** `netlify.toml` en la raíz del repo (build `npm run build`,
  publish `dist`, fallback SPA, cache-control del service worker).
- **[TODO - acción manual del usuario]** Conectar el repo de GitHub a Netlify
  (Netlify detecta `netlify.toml` automáticamente al importar el repo) y
  obtener la URL HTTPS real.
- **[TODO - acción manual del usuario]** Probar "Añadir a pantalla de inicio"
  en un iPad real con Safari: esto no se puede verificar desde aquí (sin
  acceso a un iPad físico); solo se validó que el manifest/service
  worker/iconos son correctos en un navegador de escritorio.
- **[TODO]** Sustituir el icono placeholder por uno real cuando el piloto de
  arte (Mara) cierre y exista una dirección de icono de app.

## Decisión
El juego es una **PWA** (web app instalable). Esto encaja con el constraint principal
(**no tener Mac**): no requiere macOS, Xcode ni build cloud de pago para llegar al iPad.
Ver [`adr/0001-web-pwa-stack.md`](adr/0001-web-pwa-stack.md).

## Ruta principal — PWA en iPad
1. Build de producción con Vite (`npm run build`) → estáticos + service worker + manifest.
2. Servir por HTTPS (Netlify, Vercel, Cloudflare Pages, GitHub Pages... o tu propio servidor).
3. En el iPad: Safari → Compartir → **"Añadir a pantalla de inicio"**. Queda como app
   con icono, pantalla completa y funcionamiento offline (service worker + IndexedDB).

Ventajas: cero fricción de Apple, iteración rápida, enlace privado para probar, sin Mac.
Límites a vigilar: cuota de almacenamiento y rendimiento en Safari iPad; algunas APIs
nativas no disponibles; los datos de un PWA pueden purgarse si el SO necesita espacio
(mitigación: export/import manual + `navigator.storage.persist()`).

## Backlog de rendimiento
- El build actual emite un warning no bloqueante de Vite/Rollup por chunk JS grande
  (~1.5 MB sin comprimir, ~363 kB gzip), probablemente porque Phaser entra en el bundle
  principal. No bloqueante para F7 (instalar y usar funciona igual); revisar con code
  splitting/dynamic import o `manualChunks` si el rendimiento en Safari iPad real
  resulta un problema.

## Requisitos PWA
- `manifest.webmanifest`: nombre, iconos (192/512, `public/icons/`), `display: standalone`,
  `theme_color` — generado por `vite-plugin-pwa` a partir de `vite.config.ts`.
- `<link rel="apple-touch-icon" href="/icons/icon-180.png">` en `index.html` - iOS
  Safari no usa los iconos del manifest para el icono de pantalla de inicio.
- Service worker (via `vite-plugin-pwa` / Workbox, `registerType: "autoUpdate"`) para
  offline y caché de assets.
- HTTPS obligatorio para instalar - por eso hace falta desplegar a un hosting real
  (`netlify.toml` en la raíz), no basta con probar en local.

## Si más adelante se quiere app en App Store
Envolver la PWA con **Capacitor** o **PWABuilder** (genera proyecto iOS). La subida a la
App Store sí requiere firma/cuenta Apple Developer (~99 $/año) y, para el build/submit,
macOS o un servicio de build en la nube. Pero **esto se aplaza**: no es necesario para
validar ni para uso personal.

## Vías a evitar
- Sideload opaco (AltStore/SideStore) como estrategia de producto: fricción, re-firma,
  confianza baja.
- Jailbreak: inseguro y frágil.

## Cierre
- Validación y uso personal: **PWA instalada en pantalla de inicio** (sin Mac, sin coste).
- App Store (opcional, futuro): wrapper Capacitor/PWABuilder + cuenta Apple + build cloud.
