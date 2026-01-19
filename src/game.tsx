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

    // 1. Setup World
    this.physics.world.setBounds(0, 0, width, height);
    this.physics.world.checkCollision.up = false;
    this.physics.world.checkCollision.down = true;
    this.physics.world.checkCollision.left = true;
    this.physics.world.checkCollision.right = true;

    // 2. Actors
    // The Mod (Anchor) - Blue Rectangle
    this.mod = this.add.rectangle(width / 2, height - 100, 30, 50, 0x0000ff);
    this.physics.add.existing(this.mod, true); // Static body

    // The Troll (Projectile) - Red Circle
    this.troll = this.add.circle(width / 2, height - 100, 15, 0xff0000) as any;
    this.physics.add.existing(this.troll);
    this.troll.body.setCircle(15);
    this.troll.body.setBounce(0.5);
    this.troll.body.setCollideWorldBounds(true);
    this.troll.body.setAllowGravity(false); // Initially no gravity

    // The Rope (Visual only)
    this.rope = this.add.graphics();

    // 3. Upvotes (Boosts)
    this.upvotes = this.physics.add.group();
    this.generateUpvotes();

    // 4. Score
    this.scoreText = this.add.text(20, 20, 'Score: 0', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffffff',
    }).setScrollFactor(0);

    // 5. Input
    this.input.on('pointerdown', this.handleInput, this);

    // 6. Collisions
    this.physics.add.overlap(this.troll, this.upvotes, this.handleUpvoteCollision, undefined, this);
  }

  generateUpvotes() {
    const { width, height } = this.scale;
    // Spawn upvotes starting from above the screen up to -50000 pixels
    const startY = height - 500;
    const endY = -50000;
    const gap = 400; // Vertical gap between potential upvotes

    for (let y = startY; y > endY; y -= gap) {
      if (Math.random() > 0.3) { // 70% chance to spawn at each interval
        const x = Phaser.Math.Between(50, width - 50);
        // Create an "Arrow" shape using a Triangle
        const upvote = this.add.triangle(x, y, 0, 20, 10, 0, 20, 20, 0xff4500); // Orange-Red
        this.physics.add.existing(upvote);
        (upvote.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
        (upvote.body as Phaser.Physics.Arcade.Body).setImmovable(true);
        this.upvotes.add(upvote);
      }
    }
  }

  handleUpvoteCollision(_obj1: any, obj2: any) {
    const upvote = obj2 as Phaser.GameObjects.Shape;
    // Effect: Boost velocity UP
    this.troll.body.velocity.y -= 800; // Add 800 upward velocity (negative Y)

    // Visual Feedback
    this.tweens.add({
      targets: upvote,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 100,
      onComplete: () => {
        upvote.destroy();
      }
    });
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
      this.rope.lineStyle(2, 0xffffff, 1);
      this.rope.beginPath();
      this.rope.moveTo(this.mod.x, this.mod.y);
      this.rope.lineTo(trollX, trollY);
      this.rope.strokePath();

    } else if (this.state === 'FLYING') {
      this.rope.clear();

      const startY = this.scale.height - 100;
      const currentHeight = Math.max(0, startY - this.troll.y);
      const score = Math.floor(currentHeight / 10);
      this.scoreText.setText(`Score: ${score}`);

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

    // Respawn upvotes? Or keep them destroyed? 
    // Classic Yeti Sports: Reset level.
    this.upvotes.clear(true, true);
    this.generateUpvotes();
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: 'game-container',
  backgroundColor: '#1a1a1d',
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
