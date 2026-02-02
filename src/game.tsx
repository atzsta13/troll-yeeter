import Phaser from 'phaser';
import { trpc } from './trpc';
import { VERSION } from './constants';

interface Challenge {
  id: string;
  title: string;
  description: string;
  target: number;
}

// --- Simple Synth for Retro SFX ---
class Synth {
  private ctx: AudioContext;
  private isMuted: boolean = false;

  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  setMute(muted: boolean) {
    this.isMuted = muted;
  }

  private playTone(freq: number, type: OscillatorType, duration: number, slideTo: number | null = null) {
    if (this.isMuted) return; // Skip if muted
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(slideTo, this.ctx.currentTime + duration);
    }

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playLaunch() {
    this.playTone(800, 'sawtooth', 0.5, 100);
    this.playTone(400, 'square', 0.3, 50);
  }

  playBoost() {
    this.playTone(600, 'sine', 0.2, 1200);
  }

  playWallKick() {
    this.playTone(300, 'triangle', 0.1, 50);
  }

  playDownvote() {
    this.playTone(150, 'sawtooth', 0.4, 50); // Low thud
  }

  playGameOver() {
    this.playTone(500, 'sawtooth', 1.0, 50);
  }




  // --- Dynamic Music System ---
  private bassOsc: OscillatorNode | null = null;
  private percOsc: OscillatorNode | null = null;
  private bassGain: GainNode | null = null;
  private percGain: GainNode | null = null;
  private musicStarted: boolean = false;

  startMusic() {
    if (this.musicStarted || this.isMuted) return;
    this.musicStarted = true;

    // Bass Layer (Low Sine)
    this.bassOsc = this.ctx.createOscillator();
    this.bassGain = this.ctx.createGain();
    this.bassOsc.type = 'sine';
    this.bassOsc.frequency.setValueAtTime(55, this.ctx.currentTime); // A1
    this.bassGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.bassOsc.connect(this.bassGain);
    this.bassGain.connect(this.ctx.destination);
    this.bassOsc.start();

    // Percussion Layer (Noise-like White Noise approx with High Freq Square)
    this.percOsc = this.ctx.createOscillator();
    this.percGain = this.ctx.createGain();
    this.percOsc.type = 'square';
    this.percOsc.frequency.setValueAtTime(800, this.ctx.currentTime);
    this.percGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.percOsc.connect(this.percGain);
    this.percGain.connect(this.ctx.destination);
    this.percOsc.start();
  }

  stopMusic() {
    this.musicStarted = false;
    this.bassOsc?.stop();
    this.percOsc?.stop();
    this.bassOsc = null;
    this.percOsc = null;
  }

  updateMusic(altitude: number) {
    if (!this.musicStarted || this.isMuted) return;

    // Bass fades in between 1000 and 3000
    const bVolume = Math.min(0.2, Math.max(0, (altitude - 1000) / 2000) * 0.2);
    this.bassGain?.gain.setTargetAtTime(bVolume, this.ctx.currentTime, 0.1);

    // Percussion fades in between 4000 and 8000
    const pVolume = Math.min(0.05, Math.max(0, (altitude - 4000) / 4000) * 0.05);
    this.percGain?.gain.setTargetAtTime(pVolume, this.ctx.currentTime, 0.1);
  }
}

class GameScene extends Phaser.Scene {
  private mod!: Phaser.GameObjects.Rectangle;
  private modSprite!: Phaser.GameObjects.Sprite;
  private troll!: Phaser.Physics.Arcade.Sprite;
  private rope!: Phaser.GameObjects.Graphics;
  private upvotes!: Phaser.Physics.Arcade.Group;
  private downvotes!: Phaser.Physics.Arcade.Group;
  private trollParticles!: Phaser.GameObjects.Particles.ParticleEmitter;

  private synth: Synth; // Sound Engine

  // Helper cast
  get tBody() { return this.troll.body as Phaser.Physics.Arcade.Body; }


  private state: 'IDLE' | 'SPINNING' | 'FLYING' | 'GAME_OVER' = 'IDLE';
  private angleVal: number = 0;
  private radius: number = 100;
  private rotationSpeed: number = 0.05;
  private power: number = 1200; // Nerfed from 1500
  private scoreText!: Phaser.GameObjects.Text;
  private maxScore: number = 0;

  // UI Elements
  private gameOverContainer!: Phaser.GameObjects.Container;
  private finalScoreText!: Phaser.GameObjects.Text;
  private rankText!: Phaser.GameObjects.Text;
  private leaderboardText!: Phaser.GameObjects.Text;
  private finalScoreLabel!: Phaser.GameObjects.Text;
  private actionBtnText!: Phaser.GameObjects.Text;
  private yeetBtnText!: Phaser.GameObjects.Text;
  private actionBtnContainer!: Phaser.GameObjects.Container;
  private gameOverOverlay!: Phaser.GameObjects.Rectangle;
  private muteBtn!: Phaser.GameObjects.Text;
  private isMuted: boolean = false;
  private zoneText!: Phaser.GameObjects.Text;
  private versionText!: Phaser.GameObjects.Text;
  private leftWall!: Phaser.GameObjects.Graphics;
  private rightWall!: Phaser.GameObjects.Graphics;
  private floor!: Phaser.GameObjects.Graphics;
  private pedestal!: Phaser.GameObjects.Graphics;
  private currentZone: string = '🌆 City';

  // Power-Up State
  private powerUps!: Phaser.Physics.Arcade.Group;
  private hasShield: boolean = false;
  private slowMoEndTime: number = 0;
  private shieldIndicator!: Phaser.GameObjects.Text;
  private magnetIndicator!: Phaser.GameObjects.Text;
  private iceCapIndicator!: Phaser.GameObjects.Text;
  private skyGraphics!: Phaser.GameObjects.Graphics;
  private lastRankThreshold: number = 0;
  private magnetEndTime: number = 0;
  private iceCapEndTime: number = 0;

  // Challenge State
  private currentChallenge: Challenge | null = null;
  private upvoteHits: number = 0;
  private powerupColls: number = 0;
  private challengeCompletedInRun: boolean = false;

  constructor() {
    super({ key: 'GameScene' });
    this.synth = new Synth();
  }

  // Helper for responsive layout
  get viewWidth() { return this.scale.width; }
  get viewHeight() { return this.scale.height; }

  // The playable area is clamped to 500px or full width if smaller
  get gameWidth() { return Math.min(this.viewWidth, 500); }
  get gameLeft() { return Math.floor((this.viewWidth - this.gameWidth) / 2); }
  get gameRight() { return this.gameLeft + this.gameWidth; }

  updateLayout() {
    const wallWidth = 20;
    const floorHeight = 40;
    const pedWidth = 60;
    const pedHeight = 100;
    const centerX = this.gameLeft + (this.gameWidth / 2);

    // 1. Reposition Walls
    if (this.leftWall) {
      this.leftWall.clear();
      this.leftWall.fillStyle(0x4A90E2, 1);
      this.leftWall.lineStyle(4, 0x1C5893, 1);
      this.leftWall.fillRect(this.gameLeft, -1000000, wallWidth, 1000000 + this.viewHeight);
      this.leftWall.strokeRect(this.gameLeft, -1000000, wallWidth, 1000000 + this.viewHeight);
    }
    if (this.rightWall) {
      this.rightWall.clear();
      this.rightWall.fillStyle(0x4A90E2, 1);
      this.rightWall.lineStyle(4, 0x1C5893, 1);
      this.rightWall.fillRect(this.gameRight - wallWidth, -1000000, wallWidth, 1000000 + this.viewHeight);
      this.rightWall.strokeRect(this.gameRight - wallWidth, -1000000, wallWidth, 1000000 + this.viewHeight);
    }
    if (this.floor) {
      this.floor.clear();
      this.floor.fillStyle(0xFFFFFF, 1);
      this.floor.lineStyle(4, 0x888888, 1);
      this.floor.fillRect(this.gameLeft, this.viewHeight - floorHeight, this.gameWidth, floorHeight);
      this.floor.strokeRect(this.gameLeft, this.viewHeight - floorHeight, this.gameWidth, floorHeight);
    }

    // 2. Reposition Pedestal
    if (this.pedestal) {
      this.pedestal.clear();
      this.pedestal.fillStyle(0x88CCFF, 1);
      this.pedestal.lineStyle(2, 0xFFFFFF, 1);
      const pedY = this.viewHeight - floorHeight - pedHeight;
      this.pedestal.fillRect(centerX - (pedWidth / 2), pedY, pedWidth, pedHeight);
      this.pedestal.strokeRect(centerX - (pedWidth / 2), pedY, pedWidth, pedHeight);
    }

    // 3. Reposition Start State (only if idle/spinning)
    if (this.state === 'IDLE' || this.state === 'SPINNING') {
      const pedY = this.viewHeight - floorHeight - pedHeight;
      const modY = pedY - 30;
      if (this.mod) {
        this.mod.setPosition(centerX, modY);
        // Sync body manually if needed
        (this.mod.body as Phaser.Physics.Arcade.Body).updateFromGameObject();
      }
      if (this.modSprite) this.modSprite.setPosition(centerX, modY);
      if (this.troll) {
        this.troll.setPosition(centerX, modY);
        if (this.tBody) this.tBody.updateFromGameObject();
      }
    }

    // 4. Update Physics Bounds
    this.physics.world.setBounds(this.gameLeft + wallWidth, -1000000, this.gameWidth - (wallWidth * 2), this.viewHeight - floorHeight + 1000000);

    // 5. Update UI positions
    if (this.scoreText) this.scoreText.setPosition(this.gameLeft + 20, 20);
    if (this.versionText) this.versionText.setPosition(this.viewWidth - 20, 20);
    if (this.muteBtn) this.muteBtn.setPosition(this.viewWidth - 60, 20);
    if (this.zoneText) this.zoneText.setPosition(this.viewWidth / 2, 60);
    if (this.actionBtnContainer) this.actionBtnContainer.setPosition(this.viewWidth / 2, this.viewHeight - 150);

    // Update Sky
    if (this.skyGraphics) this.updateSky(this.state === 'FLYING' ? Math.floor(Math.abs(this.viewHeight - floorHeight - this.troll.y) / 10) : 0);
  }

  createBoundaries() {
    this.leftWall = this.add.graphics().setDepth(10);
    this.rightWall = this.add.graphics().setDepth(10);
    this.floor = this.add.graphics().setDepth(10);
  }

  createAssets() {
    this.generateEmojiTexture('troll_texture', '🧌');
    this.generateEmojiTexture('star_texture', '✨', '32px');
    this.generateEmojiTexture('cloud_texture', '☁️', '128px');

    // Generate Snoo Texture (Vector)
    if (!this.textures.exists('snoo_texture')) {
      const graphics = this.make.graphics({ x: 0, y: 0 }, false);
      graphics.fillStyle(0xFFFFFF, 1);
      graphics.fillEllipse(32, 50, 40, 30);
      graphics.fillEllipse(32, 25, 50, 35);
      graphics.fillStyle(0xFF4500, 1);
      graphics.fillCircle(22, 25, 4);
      graphics.fillCircle(42, 25, 4);
      graphics.lineStyle(3, 0xFFFFFF, 1);
      graphics.beginPath();
      graphics.moveTo(32, 10);
      graphics.lineTo(40, -5);
      graphics.lineTo(48, 2);
      graphics.strokePath();
      graphics.fillStyle(0xFFFFFF, 1);
      graphics.fillCircle(48, 2, 4);
      graphics.generateTexture('snoo_texture', 64, 80);
      graphics.destroy();
    }

    if (!this.textures.exists('upvote_texture')) {
      const graphics = this.make.graphics({ x: 0, y: 0 }, false);
      graphics.fillStyle(0xFF4500, 1);
      graphics.lineStyle(4, 0xFFFFFF, 1);
      graphics.beginPath();
      graphics.moveTo(0, 30);
      graphics.lineTo(32, 0);
      graphics.lineTo(64, 30);
      graphics.lineTo(48, 30);
      graphics.lineTo(48, 64);
      graphics.lineTo(16, 64);
      graphics.lineTo(16, 30);
      graphics.closePath();
      graphics.fillPath();
      graphics.strokePath();
      graphics.generateTexture('upvote_texture', 64, 66);
      graphics.destroy();
    }

    if (!this.textures.exists('downvote_texture')) {
      const graphics = this.make.graphics({ x: 0, y: 0 }, false);
      graphics.fillStyle(0x9494FF, 1); // Periwinkle Blue
      graphics.lineStyle(4, 0xFFFFFF, 1);
      graphics.beginPath();
      // Inverted arrow
      graphics.moveTo(0, 34);
      graphics.lineTo(32, 64);
      graphics.lineTo(64, 34);
      graphics.lineTo(48, 34);
      graphics.lineTo(48, 0);
      graphics.lineTo(16, 0);
      graphics.lineTo(16, 34);
      graphics.closePath();
      graphics.fillPath();
      graphics.strokePath();
      graphics.generateTexture('downvote_texture', 64, 66);
      graphics.destroy();
    }

    // Power-Up Textures
    if (!this.textures.exists('powerup_super')) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xFFD700, 1); // Gold
      g.fillCircle(32, 32, 30);
      g.lineStyle(4, 0xFFFFFF, 1);
      g.strokeCircle(32, 32, 30);
      g.fillStyle(0xFFFFFF, 1);
      g.fillTriangle(32, 10, 20, 40, 44, 40); // Up arrow
      g.generateTexture('powerup_super', 64, 64);
      g.destroy();
    }

    if (!this.textures.exists('powerup_shield')) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0x4169E1, 1); // Royal Blue
      g.fillCircle(32, 32, 30);
      g.lineStyle(4, 0xFFFFFF, 1);
      g.strokeCircle(32, 32, 30);
      g.fillStyle(0xFFFFFF, 1);
      g.fillRoundedRect(20, 15, 24, 30, 5);
      g.generateTexture('powerup_shield', 64, 64);
      g.destroy();
    }

    if (!this.textures.exists('powerup_slowmo')) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0x9932CC, 1); // Purple
      g.fillCircle(32, 32, 30);
      g.lineStyle(4, 0xFFFFFF, 1);
      g.strokeCircle(32, 32, 30);
      g.fillStyle(0xFFFFFF, 1);
      g.fillCircle(32, 32, 15);
      g.lineStyle(3, 0x9932CC, 1);
      g.beginPath();
      g.moveTo(32, 32);
      g.lineTo(32, 22);
      g.moveTo(32, 32);
      g.lineTo(40, 32);
      g.strokePath();
      g.generateTexture('powerup_slowmo', 64, 64);
      g.destroy();
    }

    if (!this.textures.exists('powerup_magnet')) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xFF0000, 1); // Red
      g.fillCircle(32, 32, 30);
      g.lineStyle(4, 0xFFFFFF, 1);
      g.strokeCircle(32, 32, 30);
      // Magnet Horseshoe
      g.lineStyle(6, 0xFFFFFF, 1);
      g.beginPath();
      g.arc(32, 32, 15, Math.PI, 0, false);
      g.strokePath();
      g.generateTexture('powerup_magnet', 64, 64);
      g.destroy();
    }

    if (!this.textures.exists('powerup_icecap')) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0x00FFFF, 1); // Cyan
      g.fillCircle(32, 32, 30);
      g.lineStyle(4, 0xFFFFFF, 1);
      g.strokeCircle(32, 32, 30);
      // Ice Cap (Square on top half)
      g.fillStyle(0xFFFFFF, 1);
      g.fillRect(15, 10, 34, 20);
      g.generateTexture('powerup_icecap', 64, 64);
      g.destroy();
    }
  }

  generateEmojiTexture(key: string, emoji: string, fontSize: string = '64px', overwrite: boolean = false) {
    if (!this.textures.exists(key) || overwrite) {
      if (overwrite && this.textures.exists(key)) {
        this.textures.remove(key);
      }
      const text = this.make.text({
        style: { fontSize: fontSize, fontFamily: 'Arial' },
        text: emoji,
        add: false
      });
      text.setOrigin(0.5);
      const w = text.width || 64;
      const h = text.height || 64;
      const rt = this.make.renderTexture({ width: w, height: h });
      rt.draw(text, w / 2, h / 2);
      rt.saveTexture(key);
      text.destroy();
    }
  }

  createDecorations() {
    for (let i = 0; i < 40; i++) { // Increased count for wider screens
      const x = Phaser.Math.Between(0, this.viewWidth);
      const y = Phaser.Math.Between(-40000, this.viewHeight - 200);
      const cloud = this.add.image(x, y, 'cloud_texture');
      cloud.setAlpha(0.3);
      cloud.setScale(Phaser.Math.FloatBetween(0.8, 2.0));
      cloud.setDepth(-0.5);
    }
  }

  createSky() {
    // Set a deep blue background color as a safety fallback
    this.cameras.main.setBackgroundColor(0x1a1a1b);

    this.skyGraphics = this.add.graphics().setScrollFactor(0).setDepth(-10);
    this.updateSky(0);
  }

  updateSky(altitude: number) {
    if (!this.skyGraphics) return;
    this.skyGraphics.clear();

    // Shift gradient based on altitude
    // 0-5000: Blue to Dark Blue
    // 5000-20000: Dark Blue to Black
    // 20000+: Solid Black

    let topColor = 0x1A1A1B;
    let bottomColor = 0x87CEEB;

    if (altitude > 20000) {
      topColor = 0x000000;
      bottomColor = 0x000000;
    } else if (altitude > 5000) {
      const ratio = (altitude - 5000) / 15000;
      topColor = 0x000000;
      bottomColor = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(0x1A1A1B),
        Phaser.Display.Color.ValueToColor(0x000000),
        1, ratio
      ).color;
    } else {
      const ratio = altitude / 5000;
      topColor = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(0x1A1A1B),
        Phaser.Display.Color.ValueToColor(0x000000),
        1, ratio
      ).color;
      bottomColor = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(0x87CEEB),
        Phaser.Display.Color.ValueToColor(0x1A1A1B),
        1, ratio
      ).color;
    }

    const skyWidth = Math.max(this.viewWidth, 4000); // Massive width for wide desktops
    this.skyGraphics.fillGradientStyle(topColor, topColor, bottomColor, bottomColor, 1);
    // Center the fill relative to the viewWidth
    this.skyGraphics.fillRect((this.viewWidth / 2) - (skyWidth / 2), 0, skyWidth, this.viewHeight);
  }

  create() {
    this.createAssets();
    this.createSky();
    this.createDecorations();
    this.createBoundaries();

    this.physics.world.checkCollision.up = false;
    this.physics.world.checkCollision.down = true;
    this.physics.world.checkCollision.left = true;
    this.physics.world.checkCollision.right = true;
    this.physics.world.gravity.y = 400;

    this.pedestal = this.add.graphics().setDepth(5);
    const pedHeight = 100;
    const floorHeight = 40;
    const pedY = this.viewHeight - floorHeight - pedHeight;
    const centerX = this.gameLeft + (this.gameWidth / 2);

    const modY = pedY - 30;
    this.mod = this.add.rectangle(centerX, modY, 40, 60, 0x000000, 0);
    this.modSprite = this.add.sprite(centerX, modY, 'snoo_texture').setScale(0.8).setDepth(20);
    this.physics.add.existing(this.mod, true);

    this.troll = this.physics.add.sprite(centerX, modY, 'troll_texture').setScale(0.6).setDepth(15);
    this.tBody.setCircle(20);
    this.tBody.setBounce(0.8); // Pinball Bounciness
    this.tBody.setCollideWorldBounds(true);
    this.tBody.setAllowGravity(false);
    this.tBody.setDragX(0);
    this.tBody.setMaxVelocity(1500, 3000); // Increased max speed
    this.tBody.setDamping(false);
    this.tBody.setDrag(1.0); // Zero friction base

    this.trollParticles = this.add.particles(0, 0, 'star_texture', {
      speed: 10, scale: { start: 0.5, end: 0 }, alpha: { start: 1, end: 0 }, lifespan: 600, follow: this.troll, blendMode: 'ADD'
    });
    this.trollParticles.stop();

    this.rope = this.add.graphics().setDepth(18);
    this.upvotes = this.physics.add.group();
    this.downvotes = this.physics.add.group();
    this.generateUpvotes();
    this.powerUps = this.physics.add.group();
    this.generatePowerUps();

    this.shieldIndicator = this.add.text(20, 60, '', { fontSize: '24px' }).setScrollFactor(0).setDepth(100);
    this.magnetIndicator = this.add.text(20, 90, '', { fontSize: '24px' }).setScrollFactor(0).setDepth(100);
    this.iceCapIndicator = this.add.text(20, 120, '', { fontSize: '24px' }).setScrollFactor(0).setDepth(100);

    this.scoreText = this.add.text(this.gameLeft + 20, 20, 'Score: 0', {
      fontFamily: 'Verdana', fontSize: '28px', color: '#ffffff', stroke: '#000000', strokeThickness: 4,
      shadow: { blur: 2, color: '#000000', fill: true }
    }).setScrollFactor(0).setDepth(100);

    this.versionText = this.add.text(this.viewWidth - 20, 20, VERSION, {
      fontFamily: 'Verdana', fontSize: '16px', color: '#ffffff', stroke: '#000000', strokeThickness: 2
    }).setScrollFactor(0).setDepth(100).setOrigin(1, 0);

    this.zoneText = this.add.text(this.viewWidth / 2, 60, '🌆 City', {
      fontFamily: 'Verdana', fontSize: '20px', color: '#ffffff', stroke: '#000000', strokeThickness: 3
    }).setScrollFactor(0).setDepth(100).setOrigin(0.5, 0).setAlpha(0.8);

    this.muteBtn = this.add.text(this.viewWidth - 60, 20, '🔊', { fontSize: '28px' }).setScrollFactor(0).setDepth(100).setOrigin(1, 0).setInteractive();
    this.muteBtn.on('pointerdown', () => {
      this.isMuted = !this.isMuted;
      this.synth.setMute(this.isMuted);
      this.muteBtn.setText(this.isMuted ? '🔇' : '🔊');
    });

    this.input.on('pointerdown', this.handleInput, this);
    this.physics.add.overlap(this.troll, this.upvotes, this.handleUpvoteCollision, undefined, this);
    this.physics.add.overlap(this.troll, this.downvotes, this.handleDownvoteCollision, undefined, this);
    this.physics.add.overlap(this.troll, this.powerUps, this.handlePowerUpCollision, undefined, this);
    this.createActionBtn();
    this.createGameOverUI();

    // Final layout sync
    this.updateLayout();
    this.scale.on('resize', () => this.updateLayout());

    void this.loadPreferences();
    void this.loadDailyChallenge();
  }

  // ... (rest of class)

  async loadDailyChallenge() {
    try {
      this.currentChallenge = (await trpc.challenges.getDaily.query()) ?? null;
    } catch (e) {
      console.error('Failed to load challenge:', e);
    }
  }

  async loadPreferences() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prefs: any = await trpc.user.getPreferences.query();

      // Load Avatar (Snoovatar)
      if (prefs.avatarUrl && prefs.avatarUrl.startsWith('http')) {
        this.load.image('user_avatar', prefs.avatarUrl);
        this.load.once('complete', () => {
          if (this.modSprite) {
            this.modSprite.setTexture('user_avatar');
            this.modSprite.setDisplaySize(64, 80);
          }
        });
        this.load.start();
      }

      this.applyPinballPhysics();
    } catch (e) { console.error('Failed preferences load', e); }
  }

  // Ultimate Pinball Physics (fixed for all players)
  applyPinballPhysics() {
    this.physics.world.gravity.y = 800; // Heavy arcade gravity
    this.power = 1400; // Strong launch
    if (this.tBody) this.tBody.setBounce(0.9); // Super bouncy
  }

  getRank(score: number): string {
    if (score < 500) return "Lurker";
    if (score < 1500) return "Reposter";
    if (score < 3000) return "Karma Farmer";
    if (score < 6000) return "Front Page";
    if (score < 10000) return "Gilded Legend";
    return "GOD MODE";
  }

  createActionBtn() {
    this.actionBtnContainer = this.add.container(this.viewWidth / 2, this.viewHeight - 100).setScrollFactor(0).setDepth(150);

    const bg = this.add.rectangle(0, 0, 240, 70, 0xFF4500, 1);
    bg.setStrokeStyle(4, 0xFFFFFF);

    this.actionBtnText = this.add.text(0, 0, 'TAP TO SPIN', {
      fontFamily: 'Verdana', fontSize: '26px', color: '#000000', fontStyle: 'bold'
    }).setOrigin(0.5);

    this.yeetBtnText = this.add.text(0, 0, 'TAP TO YEET!', {
      fontFamily: 'Verdana', fontSize: '26px', color: '#000000', fontStyle: 'bold'
    }).setOrigin(0.5).setVisible(false);

    this.actionBtnContainer.add([bg, this.actionBtnText, this.yeetBtnText]);

    // Pulse Animation
    this.tweens.add({
      targets: this.actionBtnContainer,
      scaleX: 1.08,
      scaleY: 1.08,
      yoyo: true,
      repeat: -1,
      duration: 400
    });
  }

  generateUpvotes() {
    const startY = this.viewHeight - 800;
    const endY = -250000;
    const gap = 600; // Increased gap for balanced difficulty

    for (let y = startY; y > endY; y -= gap) {
      // Spawn on Left OR Right wall (Side Bumpers)
      const onLeft = Math.random() > 0.5;
      const margin = 60;
      const x = onLeft ? this.gameLeft + margin : this.gameRight - margin;

      const upvote = this.upvotes.create(x, y, 'upvote_texture');
      upvote.body.setAllowGravity(false);
      upvote.body.setImmovable(true);
      upvote.setScale(0.65);

      // Side Wall Movement: Oscillate near the wall
      this.tweens.add({
        targets: upvote,
        x: x + (onLeft ? 40 : -40),
        duration: Phaser.Math.Between(1000, 2000),
        yoyo: true,
        repeat: -1,
        ease: 'Cubic.easeInOut'
      });

      // 30% Chance to be a Downvote (Obstacle) instead
      if (Math.random() < 0.3) {
        upvote.destroy(); // Remove the upvote placeholder
        const downvote = this.downvotes.create(x, y, 'downvote_texture');
        downvote.body.setAllowGravity(false);
        downvote.body.setImmovable(true);
        downvote.setScale(0.65);

        this.tweens.add({
          targets: downvote,
          x: x + (onLeft ? 40 : -40),
          duration: Phaser.Math.Between(1000, 2000),
          yoyo: true,
          repeat: -1,
          ease: 'Cubic.easeInOut'
        });
      }
    }
  }

  generatePowerUps() {
    const startY = this.viewHeight - 1500;
    const endY = -250000;
    const gap = 2400;

    const powerUpTypes = ['super', 'shield', 'slowmo', 'magnet', 'icecap'];

    for (let y = startY; y > endY; y -= gap) {
      if (Math.random() > 0.4) {
        const centerX = this.gameLeft + (this.gameWidth / 2);
        const x = centerX + Phaser.Math.Between(-160, 160);
        const type = Phaser.Utils.Array.GetRandom(powerUpTypes);

        let texture = 'powerup_super';
        if (type === 'shield') texture = 'powerup_shield';
        if (type === 'slowmo') texture = 'powerup_slowmo';
        if (type === 'magnet') texture = 'powerup_magnet';
        if (type === 'icecap') texture = 'powerup_icecap';

        const powerUp = this.powerUps.create(x, y, texture);
        powerUp.body.setAllowGravity(false);
        powerUp.body.setImmovable(true);
        powerUp.setScale(0.7);
        powerUp.setData('type', type);

        // Kinetic Movement
        this.tweens.add({
          targets: powerUp,
          x: x + 60,
          yoyo: true,
          repeat: -1,
          duration: 1000,
          ease: 'Sine.easeInOut'
        });
      }
    }
  }

  createGameOverUI() {
    const cardWidth = Math.min(this.viewWidth - 40, 400);
    const cardHeight = 480;

    // Dimming Overlay
    const overlay = this.add.rectangle(0, 0, this.viewWidth, this.viewHeight, 0x000000, 0.7)
      .setOrigin(0).setInteractive().setDepth(199).setScrollFactor(0);
    overlay.setVisible(false);
    this.gameOverOverlay = overlay;

    this.gameOverContainer = this.add.container(this.viewWidth / 2, this.viewHeight / 2)
      .setScrollFactor(0).setDepth(200).setVisible(false);

    // Glassmorphic Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0f172a, 0x1e293b, 0x0f172a, 0x1e293b, 0.95);
    bg.fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 24);
    bg.lineStyle(2, 0x334155, 1);
    bg.strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 24);

    // Header Area Glow
    const headerGlow = this.add.graphics();
    headerGlow.fillGradientStyle(0xFF4500, 0xFF4500, 0x000000, 0x000000, 0.1);
    headerGlow.fillCircle(0, -150, 100);

    // Trophy Icon (Graphic instead of text for stability)
    const trophy = this.add.text(0, -170, 'TOP SCORE', {
      fontSize: '14px', color: '#FFD700', fontFamily: 'Verdana', fontStyle: '900', letterSpacing: 4
    }).setOrigin(0.5);

    // Final Score (The Big Number)
    this.finalScoreText = this.add.text(0, -110, '0', {
      fontSize: '52px', color: '#ffffff', fontFamily: 'Verdana', fontStyle: '900',
      stroke: '#000000', strokeThickness: 4,
      shadow: { blur: 15, color: '#FF4500', fill: true }
    }).setOrigin(0.5);

    this.finalScoreLabel = this.add.text(0, -65, 'ALTITUDE REACHED', {
      fontSize: '10px', color: '#94a3b8', fontFamily: 'Verdana', fontStyle: 'bold', letterSpacing: 2
    }).setOrigin(0.5);

    // Rank Badge
    this.rankText = this.add.text(0, -35, 'Lurker', {
      fontSize: '18px', color: '#FFD700', fontFamily: 'Verdana', fontStyle: 'bold',
      padding: { x: 12, y: 6 }
    }).setOrigin(0.5);

    // Sub-divider
    const divider = this.add.graphics();
    divider.lineStyle(1, 0x334155, 0.5);
    divider.lineBetween(-cardWidth / 2 + 40, 0, cardWidth / 2 - 40, 0);

    // Leaderboard Section
    const lbHeader = this.add.text(0, 25, 'LEADERBOARD', {
      fontSize: '10px', color: '#64748b', fontFamily: 'Verdana', fontStyle: '900', letterSpacing: 3
    }).setOrigin(0.5);

    this.leaderboardText = this.add.text(0, 95, 'Loading...', {
      fontSize: '13px', color: '#e2e8f0', fontFamily: 'Verdana', align: 'center', lineSpacing: 4
    }).setOrigin(0.5);

    // Replay Button (Refined)
    // Replay Button (Refined)
    const replayWidth = cardWidth - 80;
    const replayBg = this.add.rectangle(0, 185, replayWidth, 56, 0xFF4500, 1).setInteractive({ useHandCursor: true });
    replayBg.setStrokeStyle(0);
    const replayText = this.add.text(0, 185, 'REPLAY', {
      fontSize: '18px', color: '#ffffff', fontFamily: 'Verdana', fontStyle: '900', letterSpacing: 1
    }).setOrigin(0.5);

    replayBg.on('pointerover', () => replayBg.setAlpha(0.9));
    replayBg.on('pointerout', () => replayBg.setAlpha(1));
    replayBg.on('pointerdown', () => this.resetGame());

    // Pulsing replay
    this.tweens.add({ targets: [replayBg, replayText], scaleX: 1.02, scaleY: 1.02, yoyo: true, repeat: -1, duration: 800 });

    this.gameOverContainer.add([
      bg, headerGlow, trophy, this.finalScoreText, this.finalScoreLabel, this.rankText, divider, lbHeader, this.leaderboardText,
      replayBg, replayText
    ]);
  }

  // Helper for Collision to bounce off "Inner" walls properly
  handleUpvoteCollision(_obj1: unknown, obj2: unknown) {
    const upvote = obj2 as Phaser.Physics.Arcade.Sprite;
    if (!upvote.body || !upvote.body.enable) return;
    upvote.disableBody(true, false);

    if (!this.tBody) return;

    const currentVel = this.tBody.velocity.y;

    // Balanced Bumper Logic: Sharp redirection
    if (currentVel > 0) {
      this.tBody.setVelocityY(-1400); // Stronger reset upward for game feel
    } else {
      // Additive boost if already going up
      const newVel = Math.min(-2000, currentVel - 400);
      this.tBody.setVelocityY(newVel);
    }

    this.upvoteHits++;
    this.checkChallengeProgress();

    // Kick side force (Pinball bumper feel)
    const centerX = this.gameLeft + (this.gameWidth / 2);
    const repulsion = 400;

    if (upvote.x < centerX) {
      this.tBody.setVelocityX(repulsion);
      this.synth.playWallKick();
    } else {
      this.tBody.setVelocityX(-repulsion);
      this.synth.playWallKick();
    }

    // Play sound based on velocity boost
    this.synth.playBoost();

    const scorePopup = this.add.text(upvote.x, upvote.y, 'BOOST!', {
      fontFamily: 'Verdana', fontSize: '24px', color: '#FF4500', fontStyle: 'bold'
    }).setOrigin(0.5);

    this.tweens.add({
      targets: scorePopup,
      y: upvote.y - 30,
      alpha: 0,
      duration: 800,
      onComplete: () => scorePopup.destroy()
    });

    this.tweens.add({
      targets: upvote,
      alpha: 0, scaleX: 1.2, scaleY: 1.2, duration: 150,
      onComplete: () => upvote.destroy()
    });

    this.scoreText.setTint(0xFF4500);
    this.time.delayedCall(150, () => this.scoreText.clearTint());
  }

  handleDownvoteCollision(_obj1: unknown, obj2: unknown) {
    const downvote = obj2 as Phaser.Physics.Arcade.Sprite;
    if (!downvote.body || !downvote.body.enable) return;
    downvote.disableBody(true, false);

    if (this.tBody) {
      // PUNISHMENT: Downward velocity
      this.tBody.setVelocityY(800);
    }

    this.synth.playDownvote();

    const scorePopup = this.add.text(downvote.x, downvote.y, 'DOWNVOTED!', {
      fontFamily: 'Verdana', fontSize: '20px', color: '#9494FF', fontStyle: 'bold'
    }).setOrigin(0.5);

    this.tweens.add({
      targets: scorePopup,
      y: downvote.y + 30, // Fall down
      alpha: 0,
      duration: 800,
      onComplete: () => scorePopup.destroy()
    });

    this.tweens.add({
      targets: downvote,
      alpha: 0, scaleX: 0.5, scaleY: 0.5, duration: 150,
      onComplete: () => downvote.destroy()
    });
  }

  // Continue with other methods...

  handlePowerUpCollision(_obj1: unknown, obj2: unknown) {
    const powerUp = obj2 as Phaser.Physics.Arcade.Sprite;
    if (!powerUp.body || !powerUp.body.enable) return;
    powerUp.disableBody(true, false);

    const type = powerUp.getData('type') as string;

    // Apply effect based on type
    if (type === 'super') {
      // MEGA boost
      if (this.tBody) {
        this.tBody.setVelocityY(-1800); // Massive launch
      }
      this.synth.playBoost();
      this.showPowerUpPopup(powerUp.x, powerUp.y, 'MEGA YEET! 🚀', 0xFFD700);
    } else if (type === 'shield') {
      this.hasShield = true;
      // Re-enable charges logic or just powerful reusable shield
      this.shieldIndicator.setText('🛡️ KINETIC SHIELD');
      this.synth.playBoost();
      this.showPowerUpPopup(powerUp.x, powerUp.y, 'SHIELD ON! 🛡️', 0x4169E1);
    } else if (type === 'slowmo') {
      this.slowMoEndTime = this.time.now + 6000; // Longer duration
      this.physics.world.gravity.y = 150; // Ultra low gravity
      this.synth.playBoost();
      this.showPowerUpPopup(powerUp.x, powerUp.y, 'HYPER-DRIFT! ⏱️', 0x9932CC);
    } else if (type === 'magnet') {
      this.magnetEndTime = this.time.now + 10000; // 10s
      this.magnetIndicator.setText('🧲 MEGA MAGNET');
      this.synth.playBoost();
      this.showPowerUpPopup(powerUp.x, powerUp.y, 'MAGNETIC PULL! 🧲', 0xFF0000);
    } else if (type === 'icecap') {
      this.iceCapEndTime = this.time.now + 12000; // 12s
      this.iceCapIndicator.setText('🧊 ICE SLICK');
      this.tBody.setBounce(0.95);
      this.tBody.setDrag(1.0);
      this.synth.playBoost();
      this.showPowerUpPopup(powerUp.x, powerUp.y, 'ICE SLICK! 🧊', 0x00FFFF);
    }

    this.powerupColls++;
    this.checkChallengeProgress();

    // Destroy power-up
    this.tweens.add({
      targets: powerUp,
      alpha: 0, scaleX: 2, scaleY: 2, duration: 200,
      onComplete: () => powerUp.destroy()
    });
  }

  showPowerUpPopup(x: number, y: number, text: string, color: number) {
    const popup = this.add.text(x, y, text, {
      fontFamily: 'Verdana', fontSize: '28px', color: '#ffffff', fontStyle: 'bold',
      stroke: Phaser.Display.Color.IntegerToColor(color).rgba, strokeThickness: 4
    }).setOrigin(0.5);

    this.tweens.add({
      targets: popup,
      y: y - 80,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 1000,
      onComplete: () => popup.destroy()
    });
  }

  override update(_time: number, _delta: number) {
    if (!this.tBody) return;

    if (this.state === 'IDLE') {
      this.tBody.reset(this.mod.x, this.mod.y);
      this.tBody.setAllowGravity(false);
      this.tBody.setVelocity(0, 0);
      this.rope.clear();
      this.angleVal = -Math.PI / 2;
      this.rotationSpeed = 0.05;
      this.maxScore = 0;
      this.scoreText.setText('Score: 0');
      this.trollParticles.stop();

      const trollX = this.mod.x + Math.cos(this.angleVal) * this.radius;
      const trollY = this.mod.y + Math.sin(this.angleVal) * this.radius;
      this.troll.setPosition(trollX, trollY);
    } else if (this.state === 'SPINNING') {
      // Simplify rotation: Steady but slower (0.06 rad/frame)
      this.rotationSpeed = 0.06;
      this.angleVal += this.rotationSpeed;

      const trollX = this.mod.x + Math.cos(this.angleVal) * this.radius;
      const trollY = this.mod.y + Math.sin(this.angleVal) * this.radius;
      this.troll.setPosition(trollX, trollY);

      // Draw Tapered Snoo Arm (Cartoon Style)
      this.rope.clear();

      // Calculate perpendicular vector for thickness
      const dx = trollX - this.mod.x;
      const dy = trollY - this.mod.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      // Normalized perpendicular (-y, x)
      const nx = -dy / len;
      const ny = dx / len;

      const shoulderWidth = 10;
      const wristWidth = 4;

      // 4 Points of the Arm Trapezoid
      const p1x = this.mod.x + nx * shoulderWidth;
      const p1y = this.mod.y + ny * shoulderWidth;
      const p2x = this.mod.x - nx * shoulderWidth;
      const p2y = this.mod.y - ny * shoulderWidth;

      const p3x = trollX - nx * wristWidth;
      const p3y = trollY - ny * wristWidth;
      const p4x = trollX + nx * wristWidth;
      const p4y = trollY + ny * wristWidth;

      // Draw Arm Shape
      this.rope.fillStyle(0xFFFFFF, 1);
      this.rope.lineStyle(2, 0x000000, 1); // Cartoon outline

      this.rope.beginPath();
      this.rope.moveTo(p1x, p1y);
      this.rope.lineTo(p3x, p3y);
      this.rope.lineTo(p4x, p4y);
      this.rope.lineTo(p2x, p2y);
      this.rope.closePath();
      this.rope.fillPath();
      this.rope.strokePath();

      // Hand (Circle at contact point, white with outline)
      this.rope.fillStyle(0xFFFFFF, 1);
      this.rope.fillCircle(trollX, trollY, 8);
      this.rope.strokeCircle(trollX, trollY, 8);

      // --- Precision Indicator removed for Arcade feel ---
    } else if (this.state === 'FLYING') {
      this.rope.clear(); // Hide arm when flying (released)

      // Start music on first launch
      this.synth.startMusic();
      this.synth.updateMusic(this.maxScore * 10);

      const startY = this.scale.height - 100;
      const dist = startY - this.troll.y;

      // --- Magnet Effect ---
      if (this.magnetEndTime > 0) {
        if (this.time.now > this.magnetEndTime) {
          this.magnetEndTime = 0;
          this.magnetIndicator.setText('');
        } else {
          // Pull upvotes with MEGA force within 600px
          this.upvotes.getChildren().forEach((u) => {
            const upvote = u as Phaser.Physics.Arcade.Sprite;
            const d = Phaser.Math.Distance.Between(this.troll.x, this.troll.y, upvote.x, upvote.y);
            if (d < 600) {
              const angle = Phaser.Math.Angle.Between(upvote.x, upvote.y, this.troll.x, this.troll.y);
              upvote.x += Math.cos(angle) * 25; // Triple pull speed
              upvote.y += Math.sin(angle) * 25;
            }
          });
        }
      }

      // --- Ice Cap Effect ---
      if (this.iceCapEndTime > 0) {
        if (this.time.now > this.iceCapEndTime) {
          this.iceCapEndTime = 0;
          this.iceCapIndicator.setText('');
          this.tBody.setBounce(0.5);
          this.tBody.setDrag(0.998);
        } else {
          // Visual feedback
          this.troll.setTint(0x00FFFF);
        }
      } else {
        this.troll.clearTint();
      }

      this.updateSky(dist / 10);

      // --- Environmental Zones ---
      const zone = this.getCurrentZone(this.troll.y);
      if (zone !== this.currentZone) {
        this.currentZone = zone;
        this.zoneText.setText(zone);

        // Apply zone-specific gravity (Arcade weights)
        if (zone === '🌙 Space') {
          this.physics.world.gravity.y = 400;
        } else if (zone === '🪐 Beyond') {
          this.physics.world.gravity.y = 300;
        } else if (zone === '✈️ Stratosphere') {
          this.physics.world.gravity.y = 550;
        } else {
          this.physics.world.gravity.y = 700; // Normal
        }
      }

      if (dist > 0) {
        // Score multiplier in Beyond zone
        const multiplier = zone === '🪐 Beyond' ? 2 : 1;
        const score = Math.floor((dist / 10) * multiplier);
        if (score > this.maxScore) {
          this.maxScore = score;
          this.scoreText.setText(`Score: ${this.maxScore}`);
          this.checkRankUp(score);
        }
      }

      // --- Adaptive Physics (ARCADE FEEL) ---
      if (this.tBody.velocity.y < 0) {
        // Going UP
        this.tBody.setDrag(1.0); // Zero friction rise
        const liftForce = zone === '🌙 Space' || zone === '🪐 Beyond' ? 5 : 2;
        this.tBody.velocity.y -= liftForce;
      } else {
        // Falling DOWN
        this.tBody.setDrag(1.0); // Zero friction fall (MAX ACTION)
      }

      // Check slow-mo expiration
      if (this.slowMoEndTime > 0 && this.time.now > this.slowMoEndTime) {
        this.slowMoEndTime = 0;
      }

      // Game Over check
      if (this.tBody.blocked.down) {
        if (this.hasShield) {
          this.hasShield = false;
          this.shieldIndicator.setText('');
          this.tBody.setVelocityY(-1600); // MEGA Shield Bounce
          this.synth.playWallKick();
          this.showPowerUpPopup(this.troll.x, this.troll.y, 'SHIELD BURST! 💥', 0x4169E1);
        } else {
          this.gameOver();
        }
      }
    }
  }

  getCurrentZone(y: number): string {
    const height = this.scale.height - 100 - y; // Height above start
    if (height >= 10000) return '🪐 Beyond';
    if (height >= 5000) return '🌙 Space';
    if (height >= 2000) return '✈️ Stratosphere';
    return '🌆 City';
  }

  handleInput() {
    if (this.state === 'IDLE') {
      this.state = 'SPINNING';
      this.actionBtnText.setVisible(false);
      this.yeetBtnText.setVisible(true);
    } else if (this.state === 'SPINNING') {
      this.launchTroll();
      this.actionBtnContainer.setVisible(false);
    } else if (this.state === 'GAME_OVER') {
      this.resetGame();
    }
  }

  launchTroll() {
    this.state = 'FLYING';
    this.tBody.enable = true;
    this.tBody.setAllowGravity(true);
    const vx = Math.cos(this.angleVal + Math.PI / 2) * this.power;
    const vy = Math.sin(this.angleVal + Math.PI / 2) * this.power;
    this.tBody.setVelocity(vx, vy);

    // Smooth camera follow with offset (Look ahead)
    this.cameras.main.startFollow(this.troll, true, 0.5, 0.5, 0, 150);
    this.trollParticles.start();

    // Simplified launch for cleaner feel
    this.synth.playLaunch();
    this.synth.startMusic();
  }

  gameOver() {
    this.synth.playGameOver();
    this.synth.stopMusic();
    this.state = 'GAME_OVER';
    if (this.tBody) this.tBody.setVelocity(0, 0);
    this.cameras.main.stopFollow();
    this.trollParticles.stop();

    this.finalScoreText.setText(this.maxScore.toLocaleString());
    this.rankText.setText(this.getRank(this.maxScore));
    this.leaderboardText.setText("Submitting Score...");

    this.gameOverContainer.setVisible(true);
    if (this.gameOverOverlay) this.gameOverOverlay.setVisible(true);
    this.scoreText.setVisible(false);

    void this.handleGameOverAsync();
  }

  async handleGameOverAsync() {
    try {
      // 1. Submit Score
      await trpc.leaderboard.submit.mutate({ score: this.maxScore });

      // 2. Fetch Top Scores
      const lbData = await trpc.leaderboard.get.query();

      // 3. Format Display (Top 3 Global + Top 3 Subreddit)
      let lbString = "--- GLOBAL ---\n";
      lbData.global.slice(0, 3).forEach((entry: { member: string; score: number }, index: number) => {
        lbString += `${index + 1}. ${entry.member}: ${entry.score.toLocaleString()}\n`;
      });
      lbString += "\n--- SUBREDDIT ---\n";
      lbData.subreddit.slice(0, 3).forEach((entry: { member: string; score: number }, index: number) => {
        lbString += `${index + 1}. ${entry.member}: ${entry.score.toLocaleString()}\n`;
      });

      this.leaderboardText.setText(lbString);

      // Submit challenge completion
      if (this.challengeCompletedInRun && this.currentChallenge) {
        await trpc.challenges.submit.mutate({ challengeId: this.currentChallenge.id });
      }
    } catch (e) {
      console.error(e);
      this.leaderboardText.setText("Failed to load leaderboard.\nCheck internet connection.");
    }
  }

  checkRankUp(score: number) {
    const thresholds = [500, 1500, 3000, 6000, 10000];
    for (const threshold of thresholds) {
      if (score >= threshold && this.lastRankThreshold < threshold) {
        this.lastRankThreshold = threshold;
        this.showPowerUpPopup(this.troll.x, this.troll.y - 100, `${this.getRank(score)} reached! 🚀`, 0xFF4500);
        this.synth.playBoost(); // Reuse boost sound for excitement
        break;
      }
    }
    this.checkChallengeProgress(score);
  }

  checkChallengeProgress(score: number = 0) {
    if (!this.currentChallenge || this.challengeCompletedInRun) return;

    let progress = 0;
    if (this.currentChallenge.id === 'high_score') progress = score;
    else if (this.currentChallenge.id === 'upvotes') progress = this.upvoteHits;
    else if (this.currentChallenge.id === 'powerups') progress = this.powerupColls;
    else if (this.currentChallenge.id === 'stratosphere' && score >= 2000) progress = 2000;
    else if (this.currentChallenge.id === 'space' && score >= 5000) progress = 5000;
    else if (this.currentChallenge.id === 'beyond' && score >= 10000) progress = 10000;

    if (progress >= this.currentChallenge.target) {
      this.challengeCompletedInRun = true;
      this.showPowerUpPopup(this.troll.x, this.troll.y - 150, 'MISSION ACCOMPLISHED! 🏆', 0x00FF00);
      this.synth.playBoost();
    }
  }

  resetGame() {
    this.state = 'IDLE';
    this.gameOverContainer.setVisible(false);
    if (this.gameOverOverlay) this.gameOverOverlay.setVisible(false);
    this.scoreText.setVisible(true);

    this.actionBtnContainer.setVisible(true);
    this.actionBtnContainer.setVisible(true);
    this.actionBtnText.setVisible(true);
    this.yeetBtnText.setVisible(false);

    // Reset zone state
    this.physics.world.gravity.y = 700;
    this.currentZone = '🌆 City';
    this.zoneText.setText('🌆 City');
    this.applyPinballPhysics();

    this.cameras.main.setScroll(0, 0);
    if (this.tBody) this.tBody.setVelocity(0, 0);
    this.upvotes.clear(true, true);
    this.downvotes.clear(true, true);
    this.generateUpvotes();

    // Reset power-ups
    this.powerUps.clear(true, true);
    this.generatePowerUps();
    this.hasShield = false;
    this.slowMoEndTime = 0;
    this.magnetEndTime = 0;
    this.iceCapEndTime = 0;
    this.shieldIndicator.setText('');
    this.magnetIndicator.setText('');
    this.iceCapIndicator.setText('');
    this.lastRankThreshold = 0;
    this.upvoteHits = 0;
    this.powerupColls = 0;
    this.challengeCompletedInRun = false;
    this.synth.stopMusic();
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: 'game-container',
  backgroundColor: '#1A1A1B',
  antialias: true,
  pixelArt: false, // Turn off pixel art for smoother mobile fonts
  roundPixels: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 700 },
      debug: false,
    },
  },
  scene: [GameScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  }
};

new Phaser.Game(config);
