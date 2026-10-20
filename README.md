# 🛡️ GeoMacro Intel Radar — Executive Intelligence Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg)](https://opensource.org/licenses/MIT)
[![UI/UX: Executive Slate](https://img.shields.io/badge/UI/UX-Executive%20Dark%2FLight-0f172a.svg)]()
[![Stack: Vanilla JS + Tailwind](https://img.shields.io/badge/Stack-HTML5%20%7C%20TailwindCSS%20%7C%20Chart.js-blue.svg)]()
[![Deploy: GitHub Pages Ready](https://img.shields.io/badge/Deploy-GitHub%20Pages-brightgreen.svg)]()

> **Plataforma web de inteligencia estratégica y macroeconómica de nivel institucional**, diseñada para la toma de decisiones, análisis de riesgo geopolítico y monitoreo de mercados globales. Inspired by terminales de alto nivel (*Bloomberg, Stratfor, Palantir UI*).

---

## 🧭 Visión del Proyecto

En un entorno global caracterizado por la fragmentación geopolítica, shocks de oferta y volatilidad en los mercados financieros, **GeoMacro Intel Radar** sintetiza la complejidad de los acontecimientos mundiales a través de un enfoque riguroso de **análisis causal, dinamismo de actores y prospectiva de escenarios**.

La plataforma opera como un sistema vivo de inteligencia que actualiza semanalmente sus vectores clave y los consolida dinámicamente en **informes mensuales, trimestrales (Q-Reports) y memorias anuales**.

---

## ⚡ Características Principales

### 🗓️ 1. Arquitectura Temporal Acumulativa
- **Briefings Semanales**: Cobertura ágil de los acontecimientos más críticos ordenados por su impacto estructural.
- **Agregación Multinivel**: Consolidación periódica automatizada para auditar tendencias en resúmenes **Mensuales**, **Trimestrales** y el **Balance Anual**.

### 🔍 2. Análisis Causal y Prospectiva de Escenarios
- **Fichas de Causa-Efecto**: Desglose sistemático de cada acontecimiento (*¿Qué pasó?, ¿Por qué ahora?, Matriz de Ganadores/Perdedores, Impacto en Mercados y Variables a Vigilar*).
- **Proyección de Escenarios**: Definición de escenarios Base, Positivo y Negativo con probabilidades asignadas.

### ♟️ 3. Matriz Estratégica de Actores Globales
- Cuadro comparativo dinámico de objetivos, temores primarios, vectores de acción inmediata y limitaciones estructurales de grandes potencias (EE.UU., Rusia, China, UE, OPEP+, etc.).
- **Foco Especial Mediterráneo & España**: Análisis de dinámicas fronterizas, flujos de gasoductos e interacción Marruecos-Argelia.

### 📈 4. Dashboard de Macroeconomía y Mercados
- **Monitor Financiero**: Visualización de materias primas (*Brent, WTI, Gas TTF*), curva de tipos de interés y bancos centrales (Fed, BCE).
- **Ticker Continuo**: Barra superior estilo terminal financiera con cotizaciones e indicadores de riesgo en tiempo real.

### ⛽ 5. Radar de Chokepoints y Energía
- Monitoreo de fricciones marítimas en nodos logísticos críticos (**Ormuz, Bab el-Mandeb, Cabo de Buena Esperanza**) y primas de riesgo de transporte.

### 🎨 6. UI/UX Ejecutiva y Ultra-Fluida
- **Dark Mode Nativo** (Slate/Navy) con acentos Crimson, Amber y Emerald para categorización instantánea del riesgo.
- **Micro-interacciones**: Tarjetas expansibles, animaciones fluidas, drawers laterales de análisis y respuesta totalmente responsive.

---

## 🛠️ Arquitectura Técnica

Zero-build: HTML + JavaScript vanilla, Tailwind (CDN) y Chart.js. La web es una SPA de un solo archivo (`index.html`) que lee datos estáticos.

* **Fuente de verdad: JSON.** `data/days/AAAA-MM-DD.json` (diario) y `data/weeks/AAAA-Wnn.json` (semanal) conservan la estructura que necesitan los gráficos y los radares. `scripts/lib.mjs` los consolida en `data/db.json`.
* **Vista legible: Markdown.** `scripts/export-md.mjs` genera `content/diarios/AAAA-MM-DD.md`, `content/semanales/semana-WW-AAAA.md` y `content/index.json` (la lista de días que consulta la web). Son una copia en texto del contenido: no se editan a mano y se regeneran. Cada diario enlaza a su `.md` desde la pestaña Fuentes. El archivo `.nojekyll` de la raíz evita que GitHub Pages los convierta en HTML.
* **Dos modos** (selector Diario / Semanal en el raíl izquierdo):
  * **Diario** (landing): el día más reciente, dibujado desde `data/days/AAAA-MM-DD.json`. Pestañas: Resumen del día (noticia principal, titulares por importancia, cierres de mercado con variación, IA), Noticias (filtros por importancia y región), Mercados, Inteligencia artificial, Fuentes e Histórico (filtro por fechas). Flechas y selector de fecha para moverse entre días.
  * **Semanal**: el dashboard completo de la semana, con mes, trimestre y año consolidados.
* **Rutas por hash:** `#/` (último diario), `#/diario/AAAA-MM-DD[/noticias|mercados|ia|fuentes|historico]`, `#/semanal[/pestaña]`.

## 🤖 Automatización

| Workflow | Cuándo | Qué hace |
| --- | --- | --- |
| `intel.yml` | Cada día, 05:30 UTC | Diario con Gemini, semana anterior si falta, resúmenes mensual/trimestral/anual el día 1; exporta Markdown |
| `resumen-semanal.yml` | Domingos, 12:00 UTC | Sintetiza la semana ISO que termina ese domingo y exporta Markdown |

Ambos comparten `concurrency: intel`, usan el secret `GEMINI_API_KEY` y publican con commit y push (`data/` y `content/`).

```bash
node scripts/test.mjs                    # pruebas sin red ni clave
node scripts/export-md.mjs               # regenera content/ desde data/
GEMINI_API_KEY=... RUN_DATE=2026-10-25 FORCE=1 node scripts/run.mjs sunday   # semana real
npx serve .                              # web en local: http://localhost:3000
gh workflow run resumen-semanal.yml -f force=true                            # en GitHub
```

## 📂 Estructura del Repositorio

```bash
.
├── index.html                     # SPA: dashboard, Diarios y Semanales
├── data/                          # fuente de verdad (JSON) y db.json consolidado
├── content/                       # vista Markdown generada + index.json
├── scripts/                       # run.mjs, lib.mjs, export-md.mjs, test.mjs
└── .github/workflows/             # intel.yml, resumen-semanal.yml
```
