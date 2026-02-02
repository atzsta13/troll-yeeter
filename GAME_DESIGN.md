# Troll Yeeter - Game Design Document

## Overview
"Troll Yeeter" is a high-performance "Vertical Launcher" game built on the Reddit Devvit platform using **Phaser 3**. The goal is to launch a "Troll" character as high as possible by releasing them from a spinning anchor ("The Mod").

## Technical Architecture
- **Engine**: Phaser 3.60+ (via CDN/npm)
- **Physics**: Arcade Physics
- **View**: Webview (Mobile Portrait optimized)
- **Assets**: Programmatically generated using `Phaser.Graphics` (no external image files to minimize load times and 404s).

## Game Mechanics

### 1. The Actors
- **The Mod (Anchor)**:
  - **Visual**: Snoo Head (vector graphic) on a pedestal.
  - **Position**: Fixed at `{ x: width/2, y: height - 100 }`.
  - **Mechanic**: Winds up a "Snoo Arm" (cartoon tapered polygon) to throw.

- **The Troll (Projectile)**:
  - **Visual**: Troll Emoji 🧌 (Sprite).
  - **Physics**: Arcade Body (Circle 20px), Bounce 0.5.
  - **Role**: The entity being yeeted.

- **Upvotes (Boosters)**:
  - **Visual**: Orange arrows.
  - **Effect**: Boosts vertical velocity (-1400) and kicks horizontally (+/- 500) off walls.

### 2. State Machine
The game logic is strictly controlled by a 3-state machine:

| State | Behavior | Trigger / Transition |
| :--- | :--- | :--- |
| **IDLE** | Troll sits on the Mod. Gravity is OFF. | **Tap 1**: Switch to `SPINNING`. |
| **SPINNING** | Troll rotates around Mod (Radius 100px). Speed: 0.1 rad/tick. Visual "Rope" connects them. | **Tap 2**: Switch to `FLYING`. |
| **FLYING** | Tangential velocity applied. Gravity ON (800). Camera follows vertically. | **Collision (Bottom) & Stop**: Reset to `IDLE`. |

### 3. Physics & Math
- **Spinning**:
  ```javascript
  x = mod.x + Math.cos(angle) * 100;
  y = mod.y + Math.sin(angle) * 100;
  ```
- **Launch (Yeet)**:
  - Tangential Velocity: The troll must fly perpendicular to the arm.
  - Formula:
    ```javascript
    vx = Math.cos(angle - PI/2) * power;
    vy = Math.sin(angle - PI/2) * power;
    ```
  - **Power**: 1200 (Balanced for mobile responsiveness).

### 4. Camera & Environment
- **Look Ahead**: Camera offset by 150px vertically to show upcoming targets.
- **Zones**: 
    - 0-2000: City (Normal grav)
    - 2000-5000: Stratosphere (Mild grav)
    - 5000-10000: Space (Low grav)
    - 10000+: Beyond (Zero-G feel + 2x multiplier)

### 5. Scoring & Progression
- **Score calculation**: `(Total Height Traversed / 10) * ZoneMultiplier`.
- **Ranks**:
    - < 500: Lurker 😐
    - < 1500: Reposter ♻️
    - < 3000: Karma Farmer 🚜
    - < 6000: Front Page 🚀
    - < 10000: Gilded Legend 💎
    - 20000+: GOD MODE 🧌

## Juice & Polish
- **Visuals**:
    - Friendly Sky Blue -> Space Darkness gradient.
    - Particle trails (Stars/Sparkles).
    - Camera Flash & Shake on major impact (Yeet).
- **Audio**:
    - Custom `Synth` class using Web Audio API.
    - Procedural SFX for Launch, Wall Kick, Boost, and Game Over.

## Connectivity
- **Leaderboards**:
    - Backend: tRPC router `leaderboard`.
    - Storage: Redis Sorted Sets (`global_leaderboard`).
    - Flow: Submit on Game Over -> Fetch Top 5 -> Display.

## Future Improvements
- [x] Add "Boosts" or obstacles in the air.
- [x] Persistent High Score (saved to Reddit/Redis).
- [x] Visual polish (particles on launch, trail renderer).
- [x] Sound effects (Title music, "Yeet" sound).
- [ ] Cosmetic Skins.
