<div align="center">

<img src="public/icon.png" alt="Xignis" width="120"/>

# Xignis — Landing

### Página de presentación de Xignis, con fondo animado en WebGL y un título tipográfico interactivo

![React](https://img.shields.io/badge/React-18.3-black?logo=react)
![Vite](https://img.shields.io/badge/Vite-5.3-black?logo=vite)
![OGL](https://img.shields.io/badge/WebGL-OGL%201.0-black)
![Estado](https://img.shields.io/badge/estado-en%20construcción-08EF01)

</div>

---

## 📋 Contenido

- [¿Qué es esto?](#-qué-es-esto)
- [Qué se ve en pantalla](#-qué-se-ve-en-pantalla)
- [Relación con el resto de Xignis](#-relación-con-el-resto-de-xignis)
- [Requisitos](#-requisitos)
- [Cómo ejecutarlo](#-cómo-ejecutarlo)
- [Scripts disponibles](#-scripts-disponibles)
- [Estructura del proyecto](#-estructura-del-proyecto)
- [Los dos componentes principales](#-los-dos-componentes-principales)
- [Identidad visual](#-identidad-visual)
- [Cómo cambiar el contenido](#-cómo-cambiar-el-contenido)
- [Publicación](#-publicación)
- [Limitaciones actuales](#-limitaciones-actuales)
- [Créditos](#-créditos)

---

## 🎯 ¿Qué es esto?

Es la **página web de presentación de Xignis**: un sitio de una sola pantalla que
muestra la marca mientras el producto sigue en desarrollo.

No tiene formularios, ni base de datos, ni cuentas de usuario. Es una página
estática: se compila a HTML, CSS y JavaScript, y se sube a cualquier hosting.

El paquete se llama `landing-xignis` en `package.json`.

> 💡 **¿Qué significa "landing"?**
> Una *landing page* es la primera página que ve alguien que llega al sitio.
> Aquí su única función es presentar la marca y avisar que el producto está
> por salir.

---

## 👀 Qué se ve en pantalla

La pantalla completa muestra, sobre fondo negro:

- ✅ Un haz de luz animado que cae desde arriba y reacciona al movimiento del ratón.
- ✅ La palabra **Xignis** como título, con letras que se deforman según dónde esté el cursor.
- ✅ La leyenda **Proximamente** en la parte inferior.

Todo el texto y los ajustes visuales están definidos en
[`src/App.jsx`](src/App.jsx).

> _(Captura de pantalla: pendiente. El repositorio no incluye imágenes del sitio en funcionamiento.)_

---

## 🔗 Relación con el resto de Xignis

Xignis es un conjunto de repositorios separados. Este es el escaparate público;
los otros dos son aplicaciones internas con inicio de sesión:

| Repositorio | Qué es |
|---|---|
| **`xignis`** (este) | Landing pública de la marca. Sin backend. |
| [`xignis-app`](https://github.com/Leoglez10/xignis-app) | App de empleados y panel de RH (permisos y ausencias). |
| [`gestion-inventario-xignis`](https://github.com/Leoglez10/gestion-inventario-xignis) | Sistema de inventario y préstamo de equipo. |

Los tres comparten identidad visual (verde sobre negro), pero **no comparten
código ni dependen entre sí**. Este repositorio no enlaza actualmente a las
otras aplicaciones.

---

## ⚙️ Requisitos

- **Node.js** con soporte para ESM (el proyecto usa `"type": "module"`).
- **npm** — el repositorio incluye `package-lock.json`.
- Un navegador con **WebGL**, necesario para el fondo animado.

---

## 🚀 Cómo ejecutarlo

```bash
git clone https://github.com/Leoglez10/xignis.git
cd xignis
npm install
npm run dev
```

Vite imprime en la terminal la dirección local donde queda sirviendo el sitio.
No hay puerto fijado en la configuración: se usa el que Vite elija por defecto.

Para generar la versión de producción:

```bash
npm run build     # genera la carpeta dist/
npm run preview   # sirve dist/ para revisarlo antes de publicar
```

> 💡 No hay variables de entorno. El proyecto no necesita ningún archivo `.env`.

---

## 🧰 Scripts disponibles

| Script | Qué hace |
|---|---|
| `npm run dev` | Levanta el servidor de desarrollo con recarga en caliente. |
| `npm run build` | Compila el sitio a la carpeta `dist/`. |
| `npm run preview` | Sirve localmente lo que se generó en `dist/`. |

No hay scripts de test, lint ni typecheck: el proyecto no tiene esas
herramientas configuradas.

---

## 🗺 Estructura del proyecto

```text
xignis/
├── index.html                    ← Documento raíz; carga la fuente Space Grotesk
├── vite.config.js                ← Configuración de Vite (solo el plugin de React)
├── package.json
├── icon.png                      ← Copia del icono en la raíz
├── public/
│   └── icon.png                  ← Favicon servido en /icon.png
└── src/
    ├── main.jsx                  ← Punto de entrada; monta React en #root
    ├── App.jsx                   ← ⭐ Contenido y ajustes visuales de la página
    ├── index.css                 ← Variables de color y reset global
    └── components/
        ├── LightRays.jsx         ← Fondo animado en WebGL
        ├── LightRays.css
        └── TextPressure.jsx      ← Título tipográfico interactivo
```

> 💡 **Regla rápida**
> - Texto y colores de la página → `src/App.jsx`
> - Fondo animado → `src/components/LightRays.jsx`
> - Título interactivo → `src/components/TextPressure.jsx`
> - Colores globales y tipografía → `src/index.css` e `index.html`

---

## 🧩 Los dos componentes principales

### `LightRays.jsx` — fondo animado

Dibuja los haces de luz con **OGL**, una biblioteca ligera de WebGL. Renderiza un
único triángulo a pantalla completa y hace todo el trabajo visual en un
*fragment shader*.

Acepta props para controlar el efecto. Los valores que usa la página están en
`src/App.jsx`:

| Prop | Valor en la página | Para qué sirve |
|---|---|---|
| `raysOrigin` | `top-center` | Desde dónde nacen los rayos. |
| `raysColor` | `#08EF01` | Color de los rayos. |
| `raysSpeed` | `0.6` | Velocidad de la animación. |
| `lightSpread` | `0.8` | Apertura del haz. |
| `rayLength` | `1.2` | Longitud de los rayos. |
| `followMouse` | `true` | Si el haz sigue al cursor. |
| `mouseInfluence` | `0.1` | Cuánto lo desvía el cursor. |
| `noiseAmount` | `0.05` | Grano añadido a la imagen. |
| `distortion` | `0.05` | Deformación del haz. |

El componente admite además otros orígenes (`top-left`, `left`, `right`,
`bottom-left`, `bottom-center`, `bottom-right`) y props adicionales; el listado
completo está en la firma del componente en
[`src/components/LightRays.jsx`](src/components/LightRays.jsx).

### `TextPressure.jsx` — título interactivo

Renderiza cada letra por separado y ajusta su ancho, grosor e inclinación según
la distancia al cursor. En la página se usa con el texto `Xignis`, color
`#08EF01`, tamaño mínimo de 36 px y las variaciones de ancho, peso e itálica
activadas.

---

## 🎨 Identidad visual

Definida en [`src/index.css`](src/index.css) e [`index.html`](index.html):

| Elemento | Valor |
|---|---|
| Verde de marca | `#08EF01` (variable CSS `--green`) |
| Fondo | `#020401` (variable CSS `--black`) |
| Tipografía | Space Grotesk, cargada desde Google Fonts |
| Título de la pestaña | `Xignis` |
| Favicon | `/icon.png` |

> ⚠️ La fuente se descarga desde `fonts.googleapis.com`. Sin conexión a
> internet, el navegador usa la tipografía de respaldo del sistema.

---

## ✏️ Cómo cambiar el contenido

| Quiero cambiar… | Archivo | Dónde |
|---|---|---|
| El texto "Proximamente" | `src/App.jsx` | Dentro de `<p style={styles.tagline}>` |
| La palabra del título | `src/App.jsx` | Prop `text` de `<TextPressure>` |
| El color verde | `src/index.css` y `src/App.jsx` | `--green` y las props `raysColor` / `textColor` |
| La intensidad del fondo | `src/App.jsx` | Props de `<LightRays>` |
| El título de la pestaña o la descripción | `index.html` | `<title>` y `<meta name="description">` |
| El favicon | `public/icon.png` | Reemplazar el archivo |

---

## 📤 Publicación

`npm run build` deja el sitio listo en `dist/`. Al ser una página estática de una
sola ruta, se puede servir desde cualquier hosting de archivos estáticos sin
configuración adicional de rutas.

> ⚠️ El repositorio **no incluye** workflows de GitHub Actions ni ningún otro
> mecanismo de despliegue automático. La publicación es manual.

---

## ⚠️ Limitaciones actuales

- Es una página de una sola pantalla: no hay navegación, rutas ni secciones adicionales.
- No hay formulario de contacto ni captura de correos.
- No hay tests, linter ni comprobación de tipos configurados.
- No hay integración continua ni despliegue automático.
- El fondo depende de WebGL; en un navegador sin soporte no se dibuja.
- El repositorio no incluye archivo `LICENSE`, por lo que **no tiene una licencia pública declarada**.
- El texto "Proximamente" aparece sin tilde en el código actual.

---

## 👤 Créditos

<div align="center">

Diseñado y desarrollado por **Leonardo González**

[![GitHub](https://img.shields.io/badge/GitHub-Leoglez10-black?logo=github)](https://github.com/Leoglez10)

</div>
