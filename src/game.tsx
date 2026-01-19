import Phaser from 'phaser';

class GameScene extends Phaser.Scene {
  private mod!: Phaser.GameObjects.Rectangle;
  private troll!: Phaser.GameObjects.Arc & { body: Phaser.Physics.Arcade.Body };
  private rope!: Phaser.GameObjects.Graphics;
  private upvotes!: Phaser.Physics.Arcade.Group;
  private state: 'IDLE' | 'SPINNING' | 'FLYING' = 'IDLE';
  private angleVal: number = 0;
  private radius: number = 100;
  private rotationSpeed: number = 0.1;
  private power: number = 1500; // High power for "YEET" feel
  private scoreText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    const { width, height } = this.scale;

    // 0. Visuals: Sky Gradient
    this.createSky();

    // 1. Setup World
    this.physics.world.setBounds(0, -50000, width, height + 50000); // Allow going way up
    this.physics.world.checkCollision.up = false;
    this.physics.world.checkCollision.down = true;
    this.physics.world.checkCollision.left = true;
    this.physics.world.checkCollision.right = true;

    // 2. Actors
    // The Mod (Anchor) - Blue Rectangle
    // Fixed at { x: width/2, y: height - 100 }
    this.mod = this.add.rectangle(width / 2, height - 100, 40, 60, 0x0079D3); // Reddit Blue
    this.physics.add.existing(this.mod, true);

    // The Troll (Projectile) - Red Circle
    this.troll = this.add.circle(width / 2, height - 100, 15, 0xFF4500) as any; // Reddit Orange-Red
    this.physics.add.existing(this.troll);
    this.troll.body.setCircle(15);
    this.troll.body.setBounce(0.5);
    this.troll.body.setCollideWorldBounds(true);
    this.troll.body.setAllowGravity(false);

    // The Rope (Visual only)
    this.rope = this.add.graphics();

    // 3. Upvotes (Boosts)
    this.createUpvoteTexture(); // Generate the asset once
    this.upvotes = this.physics.add.group();
    this.generateUpvotes();

    // 4. Score
    this.scoreText = this.add.text(20, 20, 'Score: 0', {
      fontFamily: 'Verdana',
      fontSize: '24px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2
    }).setScrollFactor(0).setDepth(100);

    // 5. Input
    this.input.on('pointerdown', this.handleInput, this);

    // 6. Collisions
    this.physics.add.overlap(this.troll, this.upvotes, this.handleUpvoteCollision, undefined, this);
  }

  createSky() {
    const { width, height } = this.scale;
    // We want a gradient from space (black/dark blue) at -50000 to sky blue at 'height'.
    // Since Phaser gradients on huge rectangles can be tricky, let's make a fixed background 
    // that follows the camera but changes color, OR just a massive static one.
    // For simplicity and "mobile" (performance), let's use a smaller texture scaled up, 
    // or just a solid color that we darken as we go up in `update`.
    // Let's try the active approach: A background layer that is Interpolated based on height.
    // Actually, a big gradient texture is easiest to understand.

    const skyHeight = 50000 + height;
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x000000, 0x000000, 0x87CEEB, 0x87CEEB, 1);
    graphics.fillRect(0, -50000, width, skyHeight);
    graphics.setDepth(-1); // Send to back
  }

  createUpvoteTexture() {
    // Check if texture exists
    if (!this.textures.exists('upvote')) {
      const graphics = this.make.graphics({ x: 0, y: 0 }, false);
      graphics.fillStyle(0xFF4500, 1);
      graphics.lineStyle(2, 0xFFFFFF, 1);

      // Draw Upvote Arrow shape (approx 40x40)
      // Center is roughly 20,20
      graphics.beginPath();
      graphics.moveTo(0, 20);   // Left point of head
      graphics.lineTo(20, 0);   // Top tip
      graphics.lineTo(40, 20);  // Right point of head
      graphics.lineTo(30, 20);  // Indent right
      graphics.lineTo(30, 40);  // Stem right bottom
      graphics.lineTo(10, 40);  // Stem left bottom
      graphics.lineTo(10, 20);  // Indent left
      graphics.closePath();

      graphics.fillPath();
      graphics.strokePath();

      graphics.generateTexture('upvote', 40, 42);
      graphics.destroy(); // Cleanup the graphics object
    }
  }

  generateUpvotes() {
    const { width, height } = this.scale;
    const startY = height - 500;
    const endY = -50000;
    const gap = 300; // More frequent boosts

    for (let y = startY; y > endY; y -= gap) {
      if (Math.random() > 0.4) {
        const x = Phaser.Math.Between(50, width - 50);
        const upvote = this.upvotes.create(x, y, 'upvote');
        upvote.body.setAllowGravity(false);
        upvote.body.setImmovable(true);
        // Add a slight wobble for "juice"
        this.tweens.add({
          targets: upvote,
          y: y - 10,
          duration: 1500,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }
    }
  }

  handleUpvoteCollision(_obj1: any, obj2: any) {
    // obj2 is the upvote sprite (group member)
    const upvote = obj2 as Phaser.Physics.Arcade.Sprite;

    // Disable body to prevent double triggering
    if (!upvote.body || !upvote.body.enable) return;
    upvote.disableBody(true, false); // Disable physics, keep visible for tween

    // Effect: Boost velocity UP
    // If we are already going fast, add less, but ensure minimum boost
    const currentVel = this.troll.body.velocity.y;
    const boost = -1000;

    if (currentVel > 0) {
      // Falling? Shoot back up!
      this.troll.body.setVelocityY(boost);
    } else {
      // Already going up? Add speed
      this.troll.body.setVelocityY(currentVel - 600);
    }

    // Visual Feedback: Expand and Fade
    this.tweens.add({
      targets: upvote,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: 300,
      onComplete: () => {
        upvote.destroy();
      }
    });

    // Update Score Text Color temporarily for popping effect?
    this.scoreText.setTint(0xFF4500);
    this.time.delayedCall(300, () => this.scoreText.clearTint());
  }

  override update(_time: number, _delta: number) {
    if (this.state === 'IDLE') {
      this.troll.body.reset(this.mod.x, this.mod.y);
      this.troll.body.setAllowGravity(false);
      this.troll.body.setVelocity(0, 0);
      this.rope.clear();
      this.angleVal = -Math.PI / 2; // Reset angle to top

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
      const currentHeight = Math.max(0, startY - this.troll.y);
      const score = Math.floor(currentHeight / 10);
      this.scoreText.setText(`Height: ${score}`);

      // Camera Follow 
      if (this.troll.body.velocity.y > 0) {
        this.cameras.main.stopFollow();
      }

      // Reset Condition
      if (this.troll.body.blocked.down) {
        if (Math.abs(this.troll.body.velocity.y) < 20 && Math.abs(this.troll.body.velocity.x) < 20) {
          this.resetGame();
        }
      }
    }
  }

  handleInput() {
    if (this.state === 'IDLE') {
      this.state = 'SPINNING';
      this.angleVal = -Math.PI / 2;
    } else if (this.state === 'SPINNING') {
      this.launchTroll();
    }
  }

  launchTroll() {
    this.state = 'FLYING';

    this.troll.body.enable = true;
    this.troll.body.setAllowGravity(true);

    const vx = Math.cos(this.angleVal - Math.PI / 2) * this.power;
    const vy = Math.sin(this.angleVal - Math.PI / 2) * this.power;

    this.troll.body.setVelocity(vx, vy);

    this.cameras.main.startFollow(this.troll, true, 0, 0.5);
  }

  resetGame() {
    this.state = 'IDLE';
    this.cameras.main.stopFollow();
    this.cameras.main.setScroll(0, 0);
    this.troll.body.setVelocity(0, 0);

    // Clear and Respawn upvotes
    this.upvotes.clear(true, true);
    this.generateUpvotes();

    // Reset background color or effects if any
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: 'game-container',
  backgroundColor: '#87CEEB', // Default sky blue
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 800 },
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
