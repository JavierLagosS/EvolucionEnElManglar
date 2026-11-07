# 🌿 Evolución en el Manglar

> **Una aventura evolutiva interactiva inspirada en el arte clásico y tierno estilo Kirby.**  
> 🌟 *Una idea original creada e inspirada por Liam.* 🌟

[![Phaser 3](https://img.shields.io/badge/Engine-Phaser%203-blue.svg)](https://phaser.io/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Bundler-Vite-purple.svg)](https://vitejs.dev/)
[![Version](https://img.shields.io/badge/Release-v6.0-gold.svg)](https://github.com/JavierLagosS/EvolucionEnElManglar/releases)

---

## 📖 Historia y Origen

Hace miles de millones de años, el planeta Tierra no era más que una esfera volcánica colmada de fuego y energía cósmica. Tras incontables eras de enfriamiento y grandes lluvias torrenciales, se formaron los primeros océanos donde se encendió la primera chispa de la vida microscópica.

De aquellas aguas primigenias emergió un majestuoso y misterioso ecosistema vertical: **El Gran Manglar**.

En este mundo interconectado por tres estratos ecológicos, una pequeña criatura iniciará una asombrosa travesía de supervivencia, adaptación biológica y metamorfosis hasta desafiar a los depredadores más formidables de los cielos y los abismos marinos.

---

## 🎮 Características Principales

### 🎬 1. Cinemática de Origen ("Historia de Liam")
- **Motor Gráfico en Canvas 2D (60 FPS):** Cuatro viñetas ilustradas a mano estilo Kirby con transiciones suaves, paneos de cámara estilo *Ken Burns*, halos brillantes y partículas ambientales (estrellas titilantes, burbujas marinas, esporas verdes y confetis celebratorios).
- **Sintetizador Polifónico Web Audio API:** Acordes orquestados a medida para cada era evolutiva (`Cmaj9`, `Fmaj7`, `Gmaj7` y `C Mayor`).
- **Escudo y Corona de Estrellas de Liam:** Emblema central protegido por 8 estrellas doradas giratorias.
- **Acceso Directo Permanente:** Botón `🎬 Historia de Liam` en el HUD para volver a disfrutar de la historia en cualquier momento.

### 🗺️ 2. Mundo Vertical Continuo (2,400 px)
El ecosistema está dividido en tres estratos biológicos con mecánicas de cámara y físicas dedicadas:
1. **Dosel Aéreo (0 a 800 px):** Cielo crepuscular donde anidan las aves y vuelan los insectos veloces.
2. **Suelo del Manglar (800 a 1,550 px):** Plataformas de madera y raíces musgosas donde proliferan hongos, ranas y avispas.
3. **Abismo Acuático (1,550 a 2,400 px):** Océano profundo con físicas de flotabilidad y resistencia al agua, hogar de cardúmenes y calamares gigantes.

*Incluye un **Minimapa / Altímetro Vertical** en el borde derecho del HUD que rastrea en tiempo real la altura y estrato del jugador y de los jefes.*

---

## 🧬 Cadena de Evolución

El jugador avanza de fase al alimentarse de presas específicas de su estrato biológico:

| Fase | Criatura | Estrato | Dieta Exclusiva | Habilidad Especial |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **Hongo del Manglar** | Suelo | Moscas Azules | **Dispersión de Esporas:** Ralentiza a las presas cercanas. |
| **2** | **Rana Arborícola** | Suelo / Ramas | Avispas Amarillas | **Lengüetazo Rápido:** Atrapa presas a distancia media. |
| **3** | **Libélula Ágil** | Dosel Aéreo | Insectos y Peces | **Ráfaga de Viento:** Vuelo libre omnidireccional e impulso supersónico. |
| **4** | **Tiburón Abisal** | Abismo Marino | Peces Abisales | **Embestida Marina:** Natación ultra-rápida y ataque de mandíbulas. |

---

## ⚔️ Jefes y Depredadores

1. **Rana Cazadora & Peces Depredadores:** Depredadores menores agresivos que patrullan los pantanos y las profundidades.
2. **Martín Pescador Gigante (Jefe Nivel 2):** Monarca del dosel aéreo que realiza picadas fulgurantes hacia la superficie del agua. Posee fases de ataque rápido y cambio de trayectorias.
3. **Calamar Gigante (Jefe Final Nivel 3):** Titán de las profundidades marinas que desata nubes de tinta tóxica y fases de furia roja al recibir daño crítico.

### 👑 Cinemática de Coronación Final
Al derrotar al Calamar Gigante, se reproduce una ilustración interactiva dividida a pantalla completa donde la **Libélula** corona los cielos del Manglar y el **Tiburón** domina los abismos marinos, con fuegos artificiales, confeti y un panel interactivo de estadísticas de la partida.

---

## 🕹️ Controles

| Acción | Teclas / Dispositivo |
| :--- | :--- |
| **Moverse / Nadar / Volar** | `Flechas de Dirección` o `W`, `A`, `S`, `D` |
| **Saltar (Fases 1 y 2)** | `Barra Espaciadora` o `W` / `Flecha Arriba` |
| **Activar Habilidad Especial** | `Shift Izquierdo` o `Clic Derecho` |
| **Saltar Cinemática de Liam** | `Barra Espaciadora`, `Enter` o botón en pantalla |
| **Ver Historia de Liam** | Clic en el botón dorado `🎬 Historia de Liam` del HUD |

---

## 🚀 Instalación y Ejecución Local

Para clonar y ejecutar el juego en tu computadora:

```bash
# 1. Clonar el repositorio
git clone https://github.com/JavierLagosS/EvolucionEnElManglar.git
cd EvolucionEnElManglar

# 2. Instalar dependencias
npm install

# 3. Iniciar el servidor de desarrollo Vite
npm run dev
```

Abre tu navegador en `http://localhost:3000/` para jugar.

### Construcción para Producción
```bash
npm run build
```
Los archivos optimizados y empaquetados se generarán en la carpeta `dist/`.

---

## 🌟 Créditos y Dedicatoria

- **Concepto Original e Inspiración:** **Liam** 🌟
- **Motor y Desarrollo:** Phaser 3 + TypeScript + Vite.
- **Arte y Sprites:** Estilo oficial inspirado en *Kirby*.
- **Diseño de Audio:** Síntesis procedural con *Web Audio API*.

---
*Hecho con cariño para Liam y todos los exploradores de la naturaleza y la evolución.* 🌱✨
