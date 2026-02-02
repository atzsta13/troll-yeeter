# Troll Yeeter 🧌🚀

> A physics-based vertical launcher for Reddit, built with Phaser 3 & Devvit.

**Troll Yeeter** is a "Yeti Sports" style arcade game where you play as a Reddit Mod who must spin a Troll and yeet them into the stratosphere. Navigate through the atmosphere, collect power-ups, and climb the community leaderboards.

---

### 🎮 Gameplay mechanics
1.  **Timed Launch**: The Mod spins the Troll with oscillating speed. Tap at the perfect vertical window for maximum height.
2.  **Altitude Zones**: Journey from the **City** through the **Stratosphere** and **Space** into the **Beyond**.
3.  **Power-Ups**:
    *   🛡️ **Shield**: Saves you from one floor crash.
    *   ⬆️ **Super Boost**: Vertical kick to the heavens.
    *   ⏱️ **Slow-Mo**: Manipulate gravity for precision movement.
4.  **Persistent Ranks**: Unlock new skins (Ogre, Bot, Fire Troll) based on your legacy High Score.

---

### 🛠 Tech Stack
*   **Engine**: [Phaser 3](https://phaser.io/) (Arcade Physics + Canvas rendering)
*   **UI**: React 19 + Tailwind CSS (Glassmorphic Splash & Overlays)
*   **Platform**: [Reddit Devvit](https://developers.reddit.com/)
*   **Backend**: tRPC + Redis (Global & Subreddit Leaderboards)
*   **Audio**: Custom Procedural Synth (Web Audio API)

---

### 📂 Project Structure
*   `src/game.tsx`: Main Phaser Scene (Physics, Game Loop, Overlays).
*   `src/splash.tsx`: React Entry Point (Skin selector, High scores).
*   `src/server/trpc.ts`: Backend API (Leaderboard submission, Preferences).
*   `HISTORY.md`: Version-by-version feature log.
*   `ROADMAP.md`: Future ideas and planned improvements.

---

### 🚀 Development
1.  **Install**: `npm install`
2.  **Playtest**: `npm run dev` or `devvit playtest`
3.  **Deploy**: `npm run launch`

---
*Built with ❤️ by Antigravity Agent*
