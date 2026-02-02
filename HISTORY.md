### v5.0.0 (Current) - "Pure Pinball Arcade"
- **Simplified Splash**: Removed the entire Pilot Bay skin selector. The game now loads instantly with a clean, arcade-style title screen.
- **Unified Physics**: All players now have the same tuned "pinball" physics: high gravity (800), strong launch power (1400), and super bounce (0.9).
- **Instant Action**: Redesigned the start button with a high-contrast Reddit Orange style and faster pulse animation.
- **Code Cleanup**: Stripped out all pilot/skin-specific logic for a leaner, faster game loop.

### v4.3.3 - "Item Overdrive Update"
- **Magnet Buff**: Doubled effective range (600px) and tripled pull strength (speed 25) for high-octane karma collection.
- **Kinetic Shield**: Upgraded the shield to a "MEGA Shield" that provides a massive -1600 velocity burst on floor impact.
- **Hyper-Drift**: Buffed Slow-Mo duration to 6 seconds and implemented ultra-low gravity (150) for effortless altitude gain.
- **Mega Yeet**: Re-tuned the "Super Boost" item to provide an explosive instant launch of -1800 altitude.

### v4.3.2 - "Mobile & Physics Stability"
- **Mobile Overhaul**: Switched to a pure `RESIZE` scaling model, fixing the "tiny game" issue on high-DPI mobile devices.
- **Velocity Normalization**: Capped upward bumper boosts to -1500 and reduced acceleration increments to prevent uncontrolled physics loops at high altitudes.
- **Rendering Polish**: Optimized antialiasing for smoother fonts on mobile while maintaining crisp world objects.

### v4.3.1 - "Bumper Balancing"
- **Lane Clearing**: Moved all upvote boosters to the side walls (Left/Right) to prevent cluttered center paths and accidental infinite chaining.
- **Physics Cap**: Implemented a velocity ceiling (-1800 upward) to prevent the "stuck going up" bug and ensure scores reflect skill rather than glitchy physics loops.
- **Smoother Kinetic Flow**: Adjusted bumper repulsion logic for a cleaner reset, preventing jittery "stumbles" between objects.

### v4.3.0 - "Pilot Stats & Strategy"
- **Pilot Traits**: Each unlocked pilot now has unique physics attributes (Weight, Power, Bounciness), adding a strategic layer to character selection.
- **Unlock Path**: Defined clear high-score milestones for all 8 pilots (0 to 75,000 altitude).
- **UI Clarity**: Added a Trait Label to the start screen displaying the active Pilot's specialty (e.g., "Diamond Bounce", "Stable AI").

### v4.2.1 - "High Velocity Patch"
- **Physics Tuning**: Eliminated all air drag and damping during falls, ensuring the troll crashes down with maximum speed and energy.
- **Aggressive Gravity**: Scaled atmospheric gravity (standardized at 700) to maintain a heavy, fast-paced arcade feel across all height zones.
- **Removed Brake Zone**: Stripped the hidden technical slowing logic to allow for unchecked high-momentum wall play.

### v4.2.0 - "Pinball Arcade Overhaul"
- **Kinetic Playfield**: Upvotes and power-ups now oscillate horizontally, making objects much harder to hit but more rewarding to chain.
- **Bumper Physics**: Upvotes now act as high-energy "Bumpers," providing a sharp 700px repulsion on contact.
- **Improved Bounciness**: Increased the troll's bounce factor to 0.8 for a classic pinball momentum feel.
- **High-DPI Rendering**: Implemented `devicePixelRatio` scaling and Canvas mode to ensure all fonts and graphics are razor-sharp.

### v4.1.0 - "Arcade Fidelity Update"
- **Physics Overhaul**: Increased gravity to 600 and slowed down the rotation speed for a more intentional, high-stakes arcade feel.
- **Trajectory Arrow Removed**: Players must now estimate the launch angle by eye, significantly increasing the skill cap and reward factor.
- **Crisp Rendering**: Implemented pixel-perfect rendering (roundPixels: true) and disabled anti-aliasing to fix fuzzy font issues on high-DPI screens.
- **Code Optimization**: Stripped out complex pulsating speed logic and unused variables for a snappier, more stable engine.

### v4.0.8 - "True Responsive Centering"
- **Layout Engine**: Re-engineered the placement logic with a dedicated `updateLayout` method and `resize` listener, ensuring the game channel is always perfectly centered regardless of when the viewport settles.
- **UI Scaling**: Synchronized scoreboard and HUD positions with the game channel's dynamic offsets.

### v4.0.7 - "Desktop & Gameplay Final Fix"
- **Background Alignment**: Corrected the sky background centering logic to ensure 100% coverage on widescreen desktop monitors.
- **Boost Density**: Re-tuned the upvote boost spawn rate (now every 400px) and positioning for better flight flow.
- **Visual Stability**: Ensured background gradients and world elements stay aligned regardless of viewport resizing.

### v4.0.6 - "Classic Gameplay Restoration"
- **Core Mechanics**: Restored the upvote boost buttons which had been erroneously removed during refactoring.
- **Visuals**: Fixed the "black bars" issue on desktop by implementing a full-screen dynamic sky background that updates its gradient based on altitude.
- **Performance**: Optimized background rendering using a static camera overlay.

### v4.0.5 - "Layout Integrity Fix"
- **Score Overflow Fix**: Stripped redundant text from numeric displays and reduced font sizes to guarantee perfect card containment.
- **Emoji Compatibility**: Replaced text-based emojis in critical UI areas with plain text or high-res assets to prevent "diamond question mark" rendering bugs on certain platforms.

### v4.0.4 - "Premium Score Screen"
- **Game Over Overhaul**: Complete redesign of the score screen with glassmorphism, responsive sizing, and a background dimming overlay.
- **Improved Readability**: Fixed overlapping leaderboard text and optimized data formatting.

### v4.0.3 - "Compact UI Fix & Spec"
- **Splash Screen Logic**: Documented strict UI rules in `SPLASH_SPEC.md` to prevent height regressions.
- **UI Refinement**: Removed branding from splash to maximize vertical space.
- **Horizontal Refactor**: Re-engineered splash sections to use side-by-side layouts, ensuring "Start Yeeting" is always visible without scrolling.

### v4.0.2 - "Framework Refresh"
- **Dependency Update**: Upgraded Devvit to **v0.12.9**.
- **Performance**: Improved build stability on the latest platform version.

### v4.0.1 - "Polish & Refinement"
- **Game Over UI**: Removed the "Share Score" button and compacted the score screen for a cleaner look.
- **Improved Centering**: Ensuring the Game Over screen is always perfectly centered and well-proportioned.

### v4.0.0 - "The Visual Overhaul"
- **Responsive Layouts**: Full screen background with centered game channel for all screen sizes.
- **Clean Game Feel**: Removed aggressive screenshake and flash effects for a smoother, premium experience.
- **Improved Splash**: Enhanced UI with animations, glassmorphism, and centered alignment.
- **Architecture**: Unified versioning system and improved deployment pipeline.

### v3.5 - "Identity & Integrity"
- **Reddit Avatar Integration**: Users can now play as their own Reddit Avatar (Snoovatar)! The thrower sprite dynamically loads your profile image.
- **Spam Prevention**: Added strict rate limiting (10m cooldown) and minimum score checks (500+) for posting to comments.
- **Version Sync**: Bumped internal versioning to ensure cache busting and clear update tracking.

### v3.1 - "The Polish & Social Update"
- **Daily Challenges**: Dynamic missions that reward players for specific goals (e.g. "Hit 10 Upvotes").
- **Dynamic Music**: Procedural synth layers (Bass & Percussion) that fade in as altitude increases.
- **New Power-Ups**: 
    - 🧲 **Magnet**: Pulls upvotes towards the troll.
    - 🧊 **Ice Cap**: Provides zero friction and 100% bounce for 10 seconds.
- **Social Sharing**: "Share to Comments" button on Game Over to post high scores to Reddit.
- **New Skins**: Added 💎 Diamond Hands and 🥈 Silver Snoo skins for elite yeeters.

### v3.0 - "The Premium Update"

### v2.2 - "Progression & Community"
- **Subreddit Leaderboards**: Competitive rankings specific to the community where the app is posted.
- **Persistent Cosmetics**: High-score based skin unlocks (👹 Ogre, 👺 Goblin, 🤖 Bot, 🔥 Fire, 👑 King).
- **Rank-Up Popups**: Mid-air notifications for reaching major altitude milestones.
- **Physics**: Implemented terminal velocity cap and atmospheric damping.

### v1.5 - "Power Utilities"
- **Power-Ups**: Added 🛡️ Shield, ⬆️ Super Boost, and ⏱️ Slow-Mo items.
- **Camera**: Added "Look Ahead" offset (150px) to see upcoming targets during flight.
- **Indicator**: Pulsating Precision Arrow with angle-wrapped color logic.

### v1.4 - "Atmospheric Journey"
- **Zones**: Added 🌆 City, ✈️ Stratosphere, 🌙 Space, and 🪐 Beyond zones with dynamic gravity.
- **Audio**: Implemented `Synth` engine for procedural retro sound effects.
- **Mute Toggle**: Interactive sound control.

### v1.0 - "MVP"
- Core Spin-and-Yeet mechanic.
- Basic Upvote boosts and Ice Wall physics.
- Global hall of fame.
