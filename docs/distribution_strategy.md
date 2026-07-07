# Estrategia de distribución — iPad sin Mac

## Realidad técnica
Compilar localmente una app iOS/iPadOS normalmente requiere macOS + Xcode. Sin Mac, la
vía es **Unity Build Automation** (build en la nube).

## Opciones
| Opción | Sin Mac | Usuarios finales | Problema |
|---|---|---|---|
| PWA instalable | Sí | Limitada | No es app nativa Unity completa |
| Unity WebGL + PWA | Sí | Limitada | Rendimiento/almacenamiento iPad peor |
| Unity Build Automation + Apple Developer | Sí | Sí | Requiere cuenta, certificados, firma |
| TestFlight | Sí (build cloud) | Beta | App Store Connect + revisión beta |
| App Store | Sí (build cloud) | Sí | Revisión, políticas, cuenta developer |
| EU alternative distribution | Parcial | Sí (regiones) | Developer Program, notarización |
| AltStore/SideStore/sideload | Depende | No recomendable | Re-firma, fricción, confianza baja |
| Jailbreak | No | No | Inseguro, frágil |

## Rutas recomendadas
- **Ruta A — validación rápida**: Unity prototipo en escritorio + build WebGL/PWA para
  probar en iPad. Sin App Store, sin backend, enlace privado. Valida gameplay sin Apple.
- **Ruta B — app iPad real sin Mac**: Unity + Build Automation + Apple Developer +
  firma/certificados + distribución por TestFlight / App Store / EU alt.
- **Ruta C — sideload opaco**: solo para pruebas muy cerradas, **no** como estrategia de producto.

## Cierre
- V1: validar en escritorio y/o PWA.
- iPad nativo sin Mac: build cloud firmada.
- Fuera de App Store: solo vías permitidas por Apple en tu región (EU alternative
  distribution si cumples requisitos). Evitar sideload opaco como estrategia de producto.

## Fuentes
- Apple — Alternative app distribution: https://support.apple.com/en-gb/118110
- Apple — DMA and apps in the EU: https://developer.apple.com/support/dma-and-apps-in-the-eu/
- Apple — TestFlight: https://developer.apple.com/testflight/
- Unity — iOS builds sin Mac/Xcode (Build Automation): https://support.unity.com/hc/en-us/articles/32998687849108
- Unity — Build an iOS application: https://docs.unity3d.com/6000.5/Documentation/Manual/iphone-BuildProcess.html
- Apple — App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
