# Splash Screen Specification & UI Rules

To ensure the game is playable on Reddit without forcing users to scroll, the splash screen MUST adhere to the following strict constraints.

## 📏 Height Restrictions
*   **Target Post Type**: `Regular` (Standard Reddit Post height).
*   **Maximum Safe Vertical Height**: ~480px.
*   **Visibility Rule**: All primary actions (specifically the **START YEETING** button) must be visible in the initial viewport without scrolling.

## 📐 Layout Principles
1.  **Horizontal Priority**: Use horizontal rows (`flex-row`) for headers and stats to minimize vertical stack depth.
2.  **Minified Components**:
    *   **Header**: Troll icon and Title should be side-by-side.
    *   **Pilot Bay (Skin Grid)**: Use tightly packed grids (e.g., `grid-cols-4`) with minimal gap/padding.
    *   **Challenge Banner**: Keep mission descriptions to a single line and reduce vertical padding.
3.  **No Bottom Padding**: Avoid large bottom margins or branding blocks that push the "Start" button off-screen.
4.  **Static Decorations**: Use background elements sparingly and ensure they don't impact the layout flow.

## 🚫 Branding Rules
*   Refrain from adding individual branding (e.g., "By Antigravity") to the splash screen footer to maximize space for game elements and legal/docs links.
