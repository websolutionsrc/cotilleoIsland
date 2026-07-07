# Estrategia de distribución — Cotilleo Island (web/PWA)

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

## Requisitos PWA
- `manifest.webmanifest`: nombre, iconos (192/512), `display: standalone`, `theme_color`.
- Service worker (via `vite-plugin-pwa` / Workbox) para offline y caché de assets.
- HTTPS obligatorio para instalar.

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
