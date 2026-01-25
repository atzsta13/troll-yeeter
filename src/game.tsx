import Phaser from 'phaser';

class GameScene extends Phaser.Scene {
  private mod!: Phaser.GameObjects.Rectangle;
  private troll!: Phaser.Physics.Arcade.Sprite;
  private rope!: Phaser.GameObjects.Graphics;
  private upvotes!: Phaser.Physics.Arcade.Group;
  private trollParticles!: Phaser.GameObjects.Particles.ParticleEmitter;

  // Helper cast
  get tBody() { return this.troll.body as Phaser.Physics.Arcade.Body; }


  private state: 'IDLE' | 'SPINNING' | 'FLYING' | 'GAME_OVER' = 'IDLE';
  private angleVal: number = 0;
  private radius: number = 100;
  private rotationSpeed: number = 0.05;
  private power: number = 1500;
  private scoreText!: Phaser.GameObjects.Text;
  private maxScore: number = 0;

  // UI Elements
  private gameOverContainer!: Phaser.GameObjects.Container;
  private finalScoreText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'GameScene' });
  }

  createBoundaries() {
    const { width, height } = this.scale;
    const wallWidth = 20; // Reduced from 30
    const floorHeight = 40;

    const graphics = this.add.graphics();

    // Walls - High Contrast "Ice Blocks"
    graphics.fillStyle(0x4A90E2, 1);
    graphics.lineStyle(4, 0x1C5893, 1);

    // Left Wall
    graphics.fillRect(0, -500000, wallWidth, 500000 + height);
    graphics.strokeRect(0, -500000, wallWidth, 500000 + height);

    // Right Wall
    graphics.fillRect(width - wallWidth, -500000, wallWidth, 500000 + height);
    graphics.strokeRect(width - wallWidth, -500000, wallWidth, 500000 + height);

    // Floor - Solid Ground
    graphics.fillStyle(0xFFFFFF, 1);
    graphics.lineStyle(4, 0x888888, 1);
    graphics.fillRect(0, height - floorHeight, width, floorHeight);
    graphics.strokeRect(0, height - floorHeight, width, floorHeight);

    graphics.setDepth(10);

    // Physics Bounds
    this.physics.world.setBounds(wallWidth, -500000, width - (wallWidth * 2), height - floorHeight + 500000);
  }

  createAssets() {
    const generateEmojiTexture = (key: string, emoji: string, fontSize: string = '64px') => {
      if (!this.textures.exists(key)) {
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
    };
    generateEmojiTexture('troll_texture', '🧌');
    generateEmojiTexture('star_texture', '✨', '32px');
    generateEmojiTexture('cloud_texture', '☁️', '128px');

    // Generate Snoo Texture (Vector)
    if (!this.textures.exists('snoo_texture')) {
      const graphics = this.make.graphics({ x: 0, y: 0 }, false);

      // Body (White Oval)
      graphics.fillStyle(0xFFFFFF, 1);
      graphics.fillEllipse(32, 50, 40, 30);

      // Head (White Ellipse)
      graphics.fillEllipse(32, 25, 50, 35);

      // Eyes (Red Circles)
      graphics.fillStyle(0xFF4500, 1);
      graphics.fillCircle(22, 25, 4);
      graphics.fillCircle(42, 25, 4);

      // Antenna
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
  }

  createDecorations() {
    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(0, this.scale.width);
      const y = Phaser.Math.Between(-40000, this.scale.height - 200);
      const cloud = this.add.image(x, y, 'cloud_texture');
      cloud.setAlpha(0.3);
      cloud.setScale(Phaser.Math.FloatBetween(0.8, 2.0));
      cloud.setDepth(-0.5);
    }
  }

  createSky() {
    const { width, height } = this.scale;
    const skyHeight = 50000 + height;
    const graphics = this.add.graphics();
    // Reddit Dark Mode Background
    graphics.fillStyle(0x1A1A1B, 1);
    graphics.fillRect(0, -50000, width, skyHeight);
    graphics.setDepth(-1);

    // Add grid lines for "Drafts" or "Graph" feel?
    graphics.lineStyle(1, 0x343536, 0.5);
    const gridSize = 100;
    for (let i = 0; i < width; i += gridSize) {
      graphics.moveTo(i, -50000);
      graphics.lineTo(i, height);
    }
    // Vertical only or horizontal too? Just vertical is nice.
    graphics.strokePath();
  }

  create() {
    const { width, height } = this.scale;
    const floorHeight = 40;

    this.createAssets();
    this.createSky();
    this.createDecorations();
    this.createBoundaries();

    this.physics.world.checkCollision.up = false;
    this.physics.world.checkCollision.down = true;
    this.physics.world.checkCollision.left = true;
    this.physics.world.checkCollision.right = true;
    this.physics.world.gravity.y = 400;

    // --- Pedestal ---
    const pedHeight = 100;
    const pedWidth = 60;
    const pedY = height - floorHeight - pedHeight;

    // Draw Pedestal
    const pedGraphics = this.add.graphics();
    pedGraphics.fillStyle(0x88CCFF, 1); // Lighter Ice
    pedGraphics.lineStyle(2, 0xFFFFFF, 1); // White rim
    pedGraphics.fillRect((width / 2) - (pedWidth / 2), pedY, pedWidth, pedHeight);
    pedGraphics.strokeRect((width / 2) - (pedWidth / 2), pedY, pedWidth, pedHeight);
    pedGraphics.setDepth(5);

    // --- Actors ---
    // Mod (Snoo) sits on top of pedestal.
    // Pedestal Top = pedY.
    const modY = pedY - 30; // 30 (half snoo texture height approx) offset

    this.mod = this.add.rectangle(width / 2, modY, 40, 60, 0x000000, 0); // Phys Anchor
    this.add.sprite(width / 2, modY, 'snoo_texture').setScale(0.8).setDepth(20); // Visual
    this.physics.add.existing(this.mod, true);

    // Troll
    this.troll = this.physics.add.sprite(width / 2, modY, 'troll_texture').setScale(0.6).setDepth(15);
    this.tBody.setCircle(20);
    this.tBody.setBounce(0.5);
    this.tBody.setCollideWorldBounds(true);
    this.tBody.setAllowGravity(false);
    this.tBody.setDragX(0);

    // Trail
    this.trollParticles = this.add.particles(0, 0, 'star_texture', {
      speed: 10,
      scale: { start: 0.5, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 600,
      follow: this.troll,
      blendMode: 'ADD'
    });
    this.trollParticles.stop();

    this.rope = this.add.graphics();
    this.rope.setDepth(18); // Rope behind snoo but in front of bg

    // Upvotes
    this.upvotes = this.physics.add.group();
    this.generateUpvotes();

    // Score & Version
    this.scoreText = this.add.text(20, 20, 'Score: 0', {
      fontFamily: 'Verdana', fontSize: '28px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 4,
      shadow: { blur: 2, color: '#000000', fill: true }
    }).setScrollFactor(0).setDepth(100);

    this.add.text(width - 20, 20, 'v2.1', {
      fontFamily: 'Verdana', fontSize: '16px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 2
    }).setScrollFactor(0).setDepth(100).setOrigin(1, 0);

    // Input
    this.input.on('pointerdown', this.handleInput, this);
    this.physics.add.overlap(this.troll, this.upvotes, this.handleUpvoteCollision, undefined, this);
    this.createGameOverUI();
  }

  generateUpvotes() {
    const { width, height } = this.scale;
    const startY = height - 500;
    const endY = -500000;
    const gap = 500; // Slightly closer than 600
    const wallWidth = 20;
    const offset = 35; // Close to wall (Seals peeking out)

    for (let y = startY; y > endY; y -= gap) {
      if (Math.random() > 0.4) {
        const isLeft = Math.random() > 0.5;
        const x = isLeft ? (wallWidth + offset) : (width - wallWidth - offset);

        const upvote = this.upvotes.create(x, y, 'upvote_texture');
        upvote.body.setAllowGravity(false);
        upvote.body.setImmovable(true);
        upvote.setScale(0.8);

        // Point inwards/upwards like a ramp/seal head
        // 0 is Right. -PI/2 is Up.
        // We want 45 deg Up-Right for Left Wall? 
        // Logic: Arrow texture points UP by default?
        // My arrow drawing code points UP (0,-30 tip).
        // So 0 rotation = Pointing UP.
        // Left Wall: Rotate +45 (Right-Up).
        // Right Wall: Rotate -45 (Left-Up).
        upvote.setRotation(isLeft ? 0.785 : -0.785);
      }
    }
  }

  createGameOverUI() {
    const { width, height } = this.scale;
    this.gameOverContainer = this.add.container(width / 2, height / 2).setScrollFactor(0).setDepth(200).setVisible(false);

    const bg = this.add.rectangle(0, 0, 300, 200, 0x000000, 0.8);
    this.finalScoreText = this.add.text(0, -30, 'Score: 0', { fontSize: '32px', color: '#ffffff', fontFamily: 'Verdana' }).setOrigin(0.5);
    const replayText = this.add.text(0, 40, 'Tap to Replay', { fontSize: '24px', color: '#FF4500', fontFamily: 'Verdana' }).setOrigin(0.5);

    this.gameOverContainer.add([bg, this.finalScoreText, replayText]);
  }

  handleUpvoteCollision(_obj1: any, obj2: any) {
    const upvote = obj2 as Phaser.Physics.Arcade.Sprite;
    if (!upvote.body || !upvote.body.enable) return;
    upvote.disableBody(true, false);

    if (!this.tBody) return;

    const currentVel = this.tBody.velocity.y;
    // Boost Logic
    if (currentVel > 0) {
      this.tBody.setVelocityY(-1400); // Stronger bounce
    } else {
      this.tBody.setVelocityY(currentVel - 1000); // Additive boost
    }

    // Angled Kick (Wall Bounce)
    if (upvote.x < this.scale.width / 2) {
      this.tBody.setVelocityX(500); // Kick Right
    } else {
      this.tBody.setVelocityX(-500); // Kick Left
    }

    const scorePopup = this.add.text(upvote.x, upvote.y, 'BOOST!', {
      fontFamily: 'Verdana', fontSize: '24px', color: '#FF4500', fontStyle: 'bold'
    }).setOrigin(0.5);

    this.tweens.add({
      targets: scorePopup,
      y: upvote.y - 50,
      alpha: 0,
      duration: 800,
      onComplete: () => scorePopup.destroy()
    });

    this.tweens.add({
      targets: upvote,
      alpha: 0, scaleX: 1.5, scaleY: 1.5, duration: 150,
      onComplete: () => upvote.destroy()
    });

    this.scoreText.setTint(0xFF4500);
    this.time.delayedCall(150, () => this.scoreText.clearTint());

    this.cameras.main.shake(100, 0.005);
  }

  override update(_time: number, _delta: number) {
    if (!this.tBody) return;

    if (this.state === 'IDLE') {
      this.tBody.reset(this.mod.x, this.mod.y);
      this.tBody.setAllowGravity(false);
      this.tBody.setVelocity(0, 0);
      this.rope.clear();
      this.angleVal = -Math.PI / 2;
      this.rotationSpeed = 0.05; // Reset speed
      this.maxScore = 0;
      this.scoreText.setText('Score: 0');
      this.trollParticles.stop();

    } else if (this.state === 'SPINNING') {
      // Wind-up mechanic: Accelerate spin
      if (this.rotationSpeed < 0.25) {
        this.rotationSpeed += 0.001;
      }

      this.angleVal += this.rotationSpeed;
      const trollX = this.mod.x + Math.cos(this.angleVal) * this.radius;
      const trollY = this.mod.y + Math.sin(this.angleVal) * this.radius;
      this.troll.setPosition(trollX, trollY);

      this.rope.clear();
      this.rope.lineStyle(3, 0xFFFFFF, 1);
      this.rope.beginPath();
      this.rope.moveTo(this.mod.x, this.mod.y);
      this.rope.lineTo(trollX, trollY);
      this.rope.strokePath();

    } else if (this.state === 'FLYING') {
      this.rope.clear();

      const startY = this.scale.height - 100;
      const dist = startY - this.troll.y;

      if (dist > 0) {
        const score = Math.floor(dist / 10);
        if (score > this.maxScore) {
          this.maxScore = score;
          this.scoreText.setText(`Score: ${this.maxScore}`);
        }
      }

      if (this.tBody.blocked.down) {
        if (Math.abs(this.tBody.velocity.y) < 10 && Math.abs(this.tBody.velocity.x) < 10) {
          this.gameOver();
        }
      } else {
        // Just landed?
        if (this.tBody.velocity.y === 0 && this.tBody.bottom >= (this.physics.world.bounds.bottom - 1)) {
          // Impact shake if falling fast? (Hard to detect here without prev velocity, but safe to ignore for now)
        }
        this.tBody.setDragX(0);
      }
    }
  }

  handleInput() {
    if (this.state === 'IDLE') {
      this.state = 'SPINNING';
    } else if (this.state === 'SPINNING') {
      this.launchTroll();
    } else if (this.state === 'GAME_OVER') {
      this.resetGame();
    }
  }

  launchTroll() {
    this.state = 'FLYING';
    this.tBody.enable = true;
    this.tBody.setAllowGravity(true);
    const vx = Math.cos(this.angleVal - Math.PI / 2) * this.power;
    const vy = Math.sin(this.angleVal - Math.PI / 2) * this.power;
    this.tBody.setVelocity(vx, vy);
    this.tBody.setVelocity(vx, vy);
    // Smooth camera follow
    this.cameras.main.startFollow(this.troll, true, 0.1, 0.1);
    this.trollParticles.start();
  }

  gameOver() {
    this.state = 'GAME_OVER';
    if (this.tBody) this.tBody.setVelocity(0, 0);
    this.cameras.main.stopFollow();
    this.trollParticles.stop();

    this.finalScoreText.setText(`Final Score: ${this.maxScore}`);
    this.gameOverContainer.setVisible(true);
    this.scoreText.setVisible(false);
  }

  resetGame() {
    this.state = 'IDLE';
    this.gameOverContainer.setVisible(false);
    this.scoreText.setVisible(true);
    this.cameras.main.setScroll(0, 0);
    if (this.tBody) this.tBody.setVelocity(0, 0);
    this.upvotes.clear(true, true);
    this.generateUpvotes();
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: 'game-container',
  backgroundColor: '#1A1A1B', // Reddit Dark Base
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 400 },
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
