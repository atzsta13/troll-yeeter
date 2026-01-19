import Phaser from 'phaser';

class GameScene extends Phaser.Scene {
  private mod!: Phaser.GameObjects.Rectangle;
  private troll!: Phaser.GameObjects.Arc & { body: Phaser.Physics.Arcade.Body };
  private state: 'IDLE' | 'SPINNING' | 'FLYING' = 'IDLE';
  private angleVal: number = 0;
  private scoreText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    const { width, height } = this.scale;

    // 1. Actors
    // Mod (Static Blue Rectangle)
    this.mod = this.add.rectangle(width / 2, height - 100, 60, 100, 0x0000ff);

    // Troll (Red Circle)
    // Note: We cast to Arc & Body for TypeScript niceness with Arcade Physics
    this.troll = this.add.circle(width / 2, height - 100, 20, 0xff0000) as any;
    this.physics.add.existing(this.troll);

    // Disable gravity initially
    this.troll.body.setAllowGravity(false);
    this.troll.body.setCollideWorldBounds(true);
    this.troll.body.setBounce(0.5, 0.5);

    // World Bounds: Left, Right, Bottom collide. Top open.
    // By default checkCollision is { up: true, down: true, left: true, right: true }
    this.physics.world.checkCollision.up = false;

    // 2. Score
    this.scoreText = this.add.text(20, 20, 'Score: 0', {
      fontSize: '32px',
      color: '#ffffff',
    }).setScrollFactor(0); // Fix to camera

    // 3. Input
    this.input.on('pointerdown', this.handleInput, this);
  }

  override update(_time: number, delta: number) {
    if (this.state === 'SPINNING') {
      const radius = 80;
      const speed = 0.005;

      // Rotate angle via time
      this.angleVal += speed * delta;

      // Position Troll around Mod
      this.troll.x = this.mod.x + Math.cos(this.angleVal) * radius;
      this.troll.y = this.mod.y + Math.sin(this.angleVal) * radius;
    } else if (this.state === 'FLYING') {
      const height = (this.scale.height - 100) - this.troll.y;
      const score = Math.max(0, Math.floor(height / 10));
      this.scoreText.setText(`Score: ${score}`);
    }
  }

  handleInput() {
    if (this.state === 'IDLE') {
      this.state = 'SPINNING';
    } else if (this.state === 'SPINNING') {
      this.launchTroll();
    }
  }

  launchTroll() {
    this.state = 'FLYING';

    // Calculate Tangential Vector
    // Tangent angle = angleVal + PI/2 (90 degrees)
    const launchAngle = this.angleVal + Math.PI / 2;
    const power = 1000; // Velocity magnitude

    this.troll.body.setAllowGravity(true);
    // Gravity Y
    this.troll.body.setGravityY(800);

    const vx = Math.cos(launchAngle) * power;
    const vy = Math.sin(launchAngle) * power;

    this.troll.body.setVelocity(vx, vy);

    // Camera follow
    this.cameras.main.startFollow(this.troll, true, 0, 0.1);
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: 'game-container',
  backgroundColor: '#222222',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
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
