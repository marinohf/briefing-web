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

La plataforma está construida bajo una filosofía de **cero dependencias pesadas de servidor (*Zero-Build / Lightweight Stack*)**, priorizando velocidad, rendimiento extremo y facilidad de despliegue:

* **Frontend Structure**: HTML5 semántico + JavaScript Vanilla (ES6+) modular.
* **Estilos & Layout**: [Tailwind CSS CDN](https://tailwindcss.com/) con configuraciones personalizadas de color y efectos *Glassmorphism*.
* **Data Visualization**: [Chart.js](https://www.chartjs.org/) para gráficos interactivos de commodities, deuda y tráfico marítimo.
* **Iconografía**: [FontAwesome 6](https://fontawesome.com/).
* **Data Architecture**: Despliegue guiado por objetos de datos JSON desbalagados (`window.INTEL_DATABASE`), lo que permite añadir nuevas semanas/meses actualizando únicamente el archivo de datos sin tocar el código fuente de la interfaz.

---

## 📂 Estructura del Repositorio

```bash
.
├── index.html               # Aplicación web completa y dashboard ejecutable
├── assets/
│   ├── js/
│   │   ├── app.js           # Lógica de renderizado, modales, pestañas y filtros
│   │   └── data-week-X.js   # Base de datos JSON de cada briefing semanal
│   └── css/
│       └── custom.css       # Transiciones, scrollbars y estilos personalizados
├── docs/                    # Plantillas de informes y metodología analítica
└── README.md                # Documentación del proyecto
