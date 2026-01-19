# Troll Yeeter 🧌🚀

> A physics-based launcher game for Reddit, built with Devvit & Phaser 3.

**Troll Yeeter** is a "Yeti Sports" style vertical launcher where you play as a Reddit Mod spinning a Troll around ... and yeeting them into the stratosphere.

## Quick Start

1.  **Install Dependencies**:
    ```bash
    npm install
    ```
2.  **Run Locally (Playtest)**:
    ```bash
    npm run dev
    # or
    devvit playtest
    ```
3.  **Deploy**:
    ```bash
    npm run launch
    ```

## How to Play
1.  **Tap Once**: The Troll starts **spinning** around the Mod.
2.  **Tap Again**: Release the Troll at the perfect angle to send them flying **up**!
3.  **Goal**: Reach the highest altitude score possible before gravity brings them back down.

## Tech Stack & Architecture
-   **Engine**: [Phaser 3](https://phaser.io/) (Headless/Canvas)
-   **Platform**: Reddit Devvit (Blocks + Webview)
-   **Styling**: Tailwind CSS
-   **AI Tooling**: Devvit MCP Server configured (see `AGENTS.md`)

## Documentation
-   **[GAME_DESIGN.md](./GAME_DESIGN.md)**: Detailed breakdown of the game mechanics, physics formulas, and state machine.
-   **[AGENTS.md](./AGENTS.md)**: Agent directives, tech stack details, and AI tooling setup.
-   **[AGENTS.md#ai-development-tools-mcp--context](./AGENTS.md#ai-development-tools-mcp--context)**: How to use the Devvit MCP server.

## Project Structure
-   `src/server/`: Backend Devvit code (Triggers, API).
-   `src/game.tsx`: **Main Game Logic** (Phaser 3 implementation).
-   `src/splash.tsx`: Inline feed view (React).

---
*Built with the [Devvit Vibe Coding Template](https://developers.reddit.com/)*
