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
  - **Visual**: Blue Rectangle (30x50px).
  - **Position**: Fixed at `{ x: width/2, y: height - 100 }`.
  - **Role**: Static anchor point for the swinging mechanic.

- **The Troll (Projectile)**:
  - **Visual**: Red Circle (radius 15px).
  - **Physics**: Arcade Body (Circle), Bounce 0.5.
  - **Role**: The entity being yeeted.

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
  - Tangential Velocity: The troll must fly perpendicular to the rope.
  - Formula:
    ```javascript
    vx = Math.cos(angle - PI/2) * power;
    vy = Math.sin(angle - PI/2) * power;
    ```
  - **Power**: 1500 (High velocity).

### 4. Camera Behavior
- Camera follows the Troll vertically via `startFollow`.
- Focus is on tracking the ascent.
- On falling to the ground (velocity ~0), the camera resets to the start position.

### 5. Scoring
- **Score calculation**: `(MaxHeight - CurrentHeight) / 10`.
- Displayed in the top-left corner.

## Future Improvements
- [ ] Add "Boosts" or obstacles in the air.
- [ ] Persistent High Score (saved to Reddit/Redis).
- [ ] Visual polish (particles on launch, trail renderer).
- [ ] Sound effects (Title music, "Yeet" sound).
