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

    generateEmojiTexture('mod_texture', '🗿');
    generateEmojiTexture('troll_texture', '🧌');
    // generateEmojiTexture('upvote_texture', '🚀'); // Replaced with vector below
    generateEmojiTexture('star_texture', '✨', '32px');
    generateEmojiTexture('cloud_texture', '☁️', '128px');

    // Vector Upvote Arrow
    if (!this.textures.exists('upvote_texture')) {
      const graphics = this.make.graphics({ x: 0, y: 0 }, false);

      // Style: Reddit Orange #FF4500, White Outline
      graphics.fillStyle(0xFF4500, 1);
      graphics.lineStyle(4, 0xFFFFFF, 1);

      // Draw Arrow (Centered at 32, 32 approx)
      graphics.beginPath();
      graphics.moveTo(0, 30);   // Left Head
      graphics.lineTo(32, 0);   // Tip
      graphics.lineTo(64, 30);  // Right Head
      graphics.lineTo(48, 30);  // Right Neck
      graphics.lineTo(48, 64);  // Right Stem
      graphics.lineTo(16, 64);  // Left Stem
      graphics.lineTo(16, 30);  // Left Neck
      graphics.closePath();

      graphics.fillPath();
      graphics.strokePath();

      graphics.generateTexture('upvote_texture', 64, 66);
      graphics.destroy();
    }
  }

  createBoundaries() {
    const { width, height } = this.scale;
    const wallWidth = 30; // Thicker walls
    const floorHeight = 40; // Thicker floor

    const graphics = this.add.graphics();

    // Walls - High Contrast "Ice Blocks"
    graphics.fillStyle(0x4A90E2, 1); // Strong Ice Blue
    graphics.lineStyle(4, 0x1C5893, 1); // Dark Blue Border

    // Left Wall
    graphics.fillRect(0, -50000, wallWidth, 50000 + height);
    graphics.strokeRect(0, -50000, wallWidth, 50000 + height);

    // Right Wall
    graphics.fillRect(width - wallWidth, -50000, wallWidth, 50000 + height);
    graphics.strokeRect(width - wallWidth, -50000, wallWidth, 50000 + height);

    // Floor - Solid Ground
    graphics.fillStyle(0xFFFFFF, 1); // Pure White Snow
    graphics.lineStyle(4, 0x888888, 1); // Grey Border
    graphics.fillRect(0, height - floorHeight, width, floorHeight);
    graphics.strokeRect(0, height - floorHeight, width, floorHeight);

    graphics.setDepth(10);

    // Physics Bounds
    // Bottom collision at 'height - floorHeight' effectively
    this.physics.world.setBounds(wallWidth, -50000, width - (wallWidth * 2), height - floorHeight + 50000);
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
    graphics.fillGradientStyle(0x000020, 0x000020, 0x87CEEB, 0x87CEEB, 1);
    graphics.fillRect(0, -50000, width, skyHeight);
    graphics.setDepth(-1);
  }

  create() {
    const { width, height } = this.scale;

    this.createAssets();
    this.createSky();
    this.createDecorations();
    this.createBoundaries();

    // this.physics.world.setBounds... is handled in createBoundaries
    this.physics.world.checkCollision.up = false;
    this.physics.world.checkCollision.down = true;
    this.physics.world.checkCollision.left = true;
    this.physics.world.checkCollision.right = true;
    this.physics.world.gravity.y = 400;

    // Actors
    this.mod = this.add.rectangle(width / 2, height - 100, 40, 60, 0x000000, 0);
    this.add.sprite(width / 2, height - 100, 'mod_texture').setScale(0.8);
    this.physics.add.existing(this.mod, true);

    // Troll
    this.troll = this.physics.add.sprite(width / 2, height - 100, 'troll_texture').setScale(0.6);
    this.tBody.setCircle(25);
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

    // Upvotes
    this.upvotes = this.physics.add.group();
    this.generateUpvotes();

    // Score & Version
    this.scoreText = this.add.text(20, 20, 'Score: 0', {
      fontFamily: 'Verdana', fontSize: '28px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 4,
      shadow: { blur: 2, color: '#000000', fill: true }
    }).setScrollFactor(0).setDepth(100);

    this.add.text(width - 20, 20, 'v1.1', {
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
    const endY = -50000;
    const gap = 300;

    for (let y = startY; y > endY; y -= gap) {
      if (Math.random() > 0.4) {
        const isLeft = Math.random() > 0.5;
        const x = isLeft ? 40 : width - 40;

        const upvote = this.upvotes.create(x, y, 'upvote_texture');
        upvote.body.setAllowGravity(false);
        upvote.body.setImmovable(true);
        if (!isLeft) upvote.setFlipX(true);
        upvote.setScale(0.8);
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

    // Ensure body exists before accessing velocity
    if (!this.tBody) return;

    const currentVel = this.tBody.velocity.y;
    if (currentVel > 0) {
      this.tBody.setVelocityY(-1200);
    } else {
      this.tBody.setVelocityY(currentVel - 800);
    }

    this.tweens.add({
      targets: upvote,
      alpha: 0, scaleX: 2, scaleY: 2, duration: 300,
      onComplete: () => upvote.destroy()
    });

    this.scoreText.setTint(0xFF4500);
    this.time.delayedCall(300, () => this.scoreText.clearTint());
  }

  override update(_time: number, _delta: number) {
    // Safety check
    if (!this.tBody) return;

    if (this.state === 'IDLE') {
      this.tBody.reset(this.mod.x, this.mod.y);
      this.tBody.setAllowGravity(false);
      this.tBody.setVelocity(0, 0);
      this.rope.clear();
      this.angleVal = -Math.PI / 2;
      this.maxScore = 0;
      this.scoreText.setText('Score: 0');
      this.trollParticles.stop();

    } else if (this.state === 'SPINNING') {
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
        this.tBody.setDragX(500);
        if (Math.abs(this.tBody.velocity.y) < 10 && Math.abs(this.tBody.velocity.x) < 10) {
          this.gameOver();
        }
      } else {
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
    this.cameras.main.startFollow(this.troll, true, 0, 0.5);
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
  backgroundColor: '#87CEEB',
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
