import Phaser from 'phaser';

class GameScene extends Phaser.Scene {
  private mod!: Phaser.GameObjects.Rectangle;
  private troll!: Phaser.GameObjects.Arc & { body: Phaser.Physics.Arcade.Body };
  private rope!: Phaser.GameObjects.Graphics;
  private upvotes!: Phaser.Physics.Arcade.Group;
  private state: 'IDLE' | 'SPINNING' | 'FLYING' | 'GAME_OVER' = 'IDLE';
  private angleVal: number = 0;
  private radius: number = 100;
  private rotationSpeed: number = 0.1;
  private power: number = 1500;
  private scoreText!: Phaser.GameObjects.Text;
  private maxScore: number = 0;

  // UI Elements
  private gameOverContainer!: Phaser.GameObjects.Container;
  private finalScoreText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    const { width, height } = this.scale;

    // 0. Visuals: Sky Gradient
    this.createSky();

    // 1. Setup World
    this.physics.world.setBounds(0, -50000, width, height + 50000);
    this.physics.world.checkCollision.up = false;
    this.physics.world.checkCollision.down = true;
    this.physics.world.checkCollision.left = true;
    this.physics.world.checkCollision.right = true;

    // 2. Actors
    this.mod = this.add.rectangle(width / 2, height - 100, 40, 60, 0x0079D3);
    this.physics.add.existing(this.mod, true);

    this.troll = this.add.circle(width / 2, height - 100, 15, 0xFF4500) as any;
    this.physics.add.existing(this.troll);
    this.troll.body.setCircle(15);
    this.troll.body.setBounce(0.5);
    this.troll.body.setCollideWorldBounds(true);
    this.troll.body.setAllowGravity(false);

    this.rope = this.add.graphics();

    // 3. Upvotes
    this.createUpvoteTexture();
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

    // 7. UI - Game Over Screen (Hidden initially)
    this.createGameOverUI();
  }

  createSky() {
    const { width, height } = this.scale;
    const skyHeight = 50000 + height;
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x000000, 0x000000, 0x87CEEB, 0x87CEEB, 1);
    graphics.fillRect(0, -50000, width, skyHeight);
    graphics.setDepth(-1);
  }

  createUpvoteTexture() {
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
      graphics.destroy();
    }
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

        const upvote = this.upvotes.create(x, y, 'upvote');
        upvote.body.setAllowGravity(false);
        upvote.body.setImmovable(true);
        if (!isLeft) upvote.setFlipX(true);
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

    const currentVel = this.troll.body.velocity.y;
    // Boost UP - ensuring we don't just stop falling, but shoot up
    // If falling (vel > 0), simple subtraction might not be enough if falling fast.
    // Let's set a hard velocity.
    if (currentVel > 0) {
      this.troll.body.setVelocityY(-1200); // Hard bounce back up
    } else {
      this.troll.body.setVelocityY(currentVel - 800); // Add speed
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
    if (this.state === 'IDLE') {
      this.troll.body.reset(this.mod.x, this.mod.y);
      this.troll.body.setAllowGravity(false);
      this.troll.body.setVelocity(0, 0);
      this.rope.clear();
      this.angleVal = -Math.PI / 2;
      this.maxScore = 0;
      this.scoreText.setText('Score: 0');

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

      // Update Score
      // Base height is scale.height - 100. Troll Y decreases as it goes up.
      // Distance = Base - TrollY
      const startY = this.scale.height - 100;
      const dist = startY - this.troll.y;

      if (dist > 0) {
        const score = Math.floor(dist / 10);
        if (score > this.maxScore) {
          this.maxScore = score;
          this.scoreText.setText(`Score: ${this.maxScore}`);
        }
      }

      // Camera Follow logic: Only follow if we are going UP (or near peak)
      // If user wants to see the fall, we follow. But prompt said "do not downgrade score".
      // Score logic is fixed above (only updates if > maxScore).
      // Camera: Let's follow on the way down too, so we see when we hit the ground.
      // Reset logic handles the game over.

      // Reset Condition: Collides with Bottom (Floor)
      if (this.troll.body.blocked.down) {
        // Ensure we aren't just starting launch (check velocity)
        // Wait for it to settle? Or instant game over on floor hit?
        // Yeti sports usually ends when you hit the snow.
        this.gameOver();
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
    this.troll.body.enable = true;
    this.troll.body.setAllowGravity(true);
    const vx = Math.cos(this.angleVal - Math.PI / 2) * this.power;
    const vy = Math.sin(this.angleVal - Math.PI / 2) * this.power;
    this.troll.body.setVelocity(vx, vy);
    this.cameras.main.startFollow(this.troll, true, 0, 0.5);
  }

  gameOver() {
    this.state = 'GAME_OVER';
    this.troll.body.setVelocity(0, 0); // Stop physics
    this.cameras.main.stopFollow();

    this.finalScoreText.setText(`Final Score: ${this.maxScore}`);
    this.gameOverContainer.setVisible(true);
    this.scoreText.setVisible(false);
  }

  resetGame() {
    this.state = 'IDLE';

    // UI Reset
    this.gameOverContainer.setVisible(false);
    this.scoreText.setVisible(true);

    // Camera Reset
    // We need to snap back to the bottom.
    // Since we used startFollow, unsetting it and setting scroll works.
    this.cameras.main.setScroll(0, 0); // Mod is at 0,0 relative to initial cam viewport?
    // Wait, mod is at height-100.
    // Initial camera scroll is 0.
    // Yes.

    this.troll.body.setVelocity(0, 0);
    this.upvotes.clear(true, true);
    this.generateUpvotes();
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
