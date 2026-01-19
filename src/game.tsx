import Phaser from 'phaser';

class GameScene extends Phaser.Scene {
  private mod!: Phaser.GameObjects.Rectangle;
  private troll!: Phaser.GameObjects.Arc & { body: Phaser.Physics.Arcade.Body };
  private rope!: Phaser.GameObjects.Graphics;
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
    // Collision on Left, Right, Bottom. Top is open.
    this.physics.world.checkCollision.up = false;
    this.physics.world.checkCollision.down = true;
    this.physics.world.checkCollision.left = true;
    this.physics.world.checkCollision.right = true;

    // 2. Actors
    // The Mod (Anchor) - Blue Rectangle
    // Fixed at { x: width/2, y: height - 100 }
    this.mod = this.add.rectangle(width / 2, height - 100, 30, 50, 0x0000ff);
    this.physics.add.existing(this.mod, true); // Static body

    // The Troll (Projectile) - Red Circle
    // Note: We cast to Arc & Body to help TypeScript understand Arcade Physics body methods
    this.troll = this.add.circle(width / 2, height - 100, 15, 0xff0000) as any;
    this.physics.add.existing(this.troll);
    this.troll.body.setCircle(15);
    this.troll.body.setBounce(0.5);
    this.troll.body.setCollideWorldBounds(true);
    this.troll.body.setAllowGravity(false); // Initially no gravity

    // The Rope (Visual only)
    this.rope = this.add.graphics();

    // 3. Score
    this.scoreText = this.add.text(20, 20, 'Score: 0', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffffff',
    }).setScrollFactor(0);

    // 4. Input
    this.input.on('pointerdown', this.handleInput, this);
  }

  override update(_time: number, _delta: number) {
    if (this.state === 'IDLE') {
      // State A: IDLE
      // Troll is positioned exactly at the Mod's coordinates.
      this.troll.body.reset(this.mod.x, this.mod.y);
      this.troll.body.setAllowGravity(false);
      this.troll.body.setVelocity(0, 0);
      this.rope.clear();
      this.angleVal = -Math.PI / 2; // Reset angle to top

    } else if (this.state === 'SPINNING') {
      // State B: SPINNING
      // Rotate Troll around Mod
      this.angleVal += this.rotationSpeed;

      const trollX = this.mod.x + Math.cos(this.angleVal) * this.radius;
      const trollY = this.mod.y + Math.sin(this.angleVal) * this.radius;

      this.troll.setPosition(trollX, trollY);

      // Visuals: Draw thin white line
      this.rope.clear();
      this.rope.lineStyle(2, 0xffffff, 1);
      this.rope.beginPath();
      this.rope.moveTo(this.mod.x, this.mod.y);
      this.rope.lineTo(trollX, trollY);
      this.rope.strokePath();

    } else if (this.state === 'FLYING') {
      this.rope.clear();

      // Update Score based on height (inverted Y)
      const startY = this.scale.height - 100;
      const currentHeight = Math.max(0, startY - this.troll.y);
      const score = Math.floor(currentHeight / 10);
      this.scoreText.setText(`Score: ${score}`);

      // Camera Follow Logic 
      // "Do not follow if Troll moves down" -> Only set scroll if new Y is less (higher) than current scroll + offset
      // But startFollow is simpler. To stick to spec "Do not follow if Troll moves down":
      // We can manually manage scrollY or use startFollow with deadzone/lerp.
      // The prompt asked for: this.cameras.main.startFollow(troll, true, 0, 0.5)
      // AND "Do not follow if Troll moves down".
      // Phaser's startFollow doesn't support "only one direction" out of the box easily without custom update loc.
      // However, we can use setBounds or min/max scroll.
      // Let's implement manual follow for strict adherence?
      // Actually, startFollow usually centers it. If the troll falls, the camera follows down.
      // Let's stick to the EXPLICIT instruction code first: `startFollow(troll, true, 0, 0.5)`
      // If the user REALLY wants "no down follow", we'd need to stop follow when velocity.y > 0.

      if (this.troll.body.velocity.y > 0) {
        this.cameras.main.stopFollow();
      } else {
        // Re-engage if going up? Or just once stops, it stops?
        // "Yeti Sports" style usually follows up, then pauses at apex, then you fall out of frame.
        if (!this.cameras.main.deadzone) { // Check if not following
          // We might just leave it stopped once it starts falling to let it fall "out" of view?
          // But we need to see the landing for reset.
          // Let's keep it simple: Camera follows. If explicitly requested "Do not follow down", we stop at apex.
          // But we need to see the bottom to reset.
          // COMPROMISE: Follow normally for now to ensure playable loop. User can refine.
          // Actually, the prompt says "Do not follow if Troll moves down".
          // So: stop follow at Apex.
        }
      }

      // Reset Condition: Collides with Bottom AND velocity near zero
      // We check if it's on the floor.
      // Note: mod is at height - 100. Floor is at height.
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
      this.angleVal = -Math.PI / 2; // Start at top
    } else if (this.state === 'SPINNING') {
      this.launchTroll();
    }
  }

  launchTroll() {
    this.state = 'FLYING';

    // Enable Physics Body
    this.troll.body.enable = true;
    this.troll.body.setAllowGravity(true);

    // Vector Math: Tangential Velocity
    // "Math.cos(angle - Math.PI/2) * power"
    // Note: this.angleVal is the current angle.
    const vx = Math.cos(this.angleVal - Math.PI / 2) * this.power;
    const vy = Math.sin(this.angleVal - Math.PI / 2) * this.power;

    this.troll.body.setVelocity(vx, vy);

    // Camera: Execute startFollow
    this.cameras.main.startFollow(this.troll, true, 0, 0.5);
  }

  resetGame() {
    this.state = 'IDLE';
    this.cameras.main.stopFollow();

    // Snap camera back to 0,0 (or where mod is visible)
    // Since Mod is at bottom, camera scrollY should be 0 (if world is same size as screen initially)
    this.cameras.main.setScroll(0, 0);
    this.troll.body.setVelocity(0, 0);
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
