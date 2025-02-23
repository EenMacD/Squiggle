export interface Position {
  x: number;
  y: number;
}

export interface Player {
  id: string;
  team: 1 | 2;
  position: Position;
}

export interface BallState {
  position: Position;
  possessionPlayerId: string | null;
}

export interface GameState {
  players: Player[];
  selectedPlayer: string | null;
  isRecording: boolean;
  keyFrames: Array<{
    timestamp: number;
    positions: Record<string, Position>;
    ball: BallState;
  }>;
  ball: BallState;
  isDraggingBall: boolean;
  isBallSelected: boolean;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  public state: GameState; // Made public for Controls component to access
  private isDragging: boolean = false;
  private playbackInterval: number | null = null;
  private currentKeyFrameIndex: number = 0;
  private animationFrameId: number | null = null;
  private playbackSpeed: number = 1;
  private lastFrameTime: number = 0;
  private readonly TOKEN_SPACING = 40;
  private readonly TOKEN_RADIUS = 15;
  private readonly TOKENS_PER_ROW = 3;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;

    const initialBallState: BallState = {
      position: {
        x: canvas.width * 0.25,
        y: canvas.height / 2
      },
      possessionPlayerId: null
    };

    this.state = {
      players: [],
      selectedPlayer: null,
      isRecording: false,
      keyFrames: [],
      ball: initialBallState,
      isDraggingBall: false,
      isBallSelected: false
    };

    this.render();
  }

  public spawnTokens(team: 1 | 2, count: number) {
    if (count <= 0) return;

    const existingTeamPlayers = this.state.players.filter(p => p.team === team).length;
    const startX = team === 1 ? 100 : this.canvas.width - 100;
    const startY = this.canvas.height - 100;

    for (let i = 0; i < count; i++) {
      const totalPlayers = existingTeamPlayers + i;
      const row = Math.floor(totalPlayers / this.TOKENS_PER_ROW);
      const col = totalPlayers % this.TOKENS_PER_ROW;

      const x = startX + (col * this.TOKEN_SPACING) * (team === 1 ? 1 : -1);
      const y = startY - (row * this.TOKEN_SPACING);

      const playerId = `team${team}-${this.state.players.length}`;

      this.state.players.push({
        id: playerId,
        team,
        position: { x, y }
      });

      // If this is the first player added to the game, give them the ball
      if (this.state.players.length === 1) {
        const offset = 25;
        this.state.ball.possessionPlayerId = playerId;
        this.state.ball.position = {
          x: x + offset,
          y: y - offset
        };
      }
    }

    this.render();
  }

  public startDragging(x: number, y: number) {
    // Check for default position button clicks
    const bottomY = this.canvas.height - 80; // Moved up above the bottom line
    [1, 2].forEach(team => {
      const isTeam1 = team === 1;
      const spawnerX = isTeam1 ? 50 : this.canvas.width - 50;
      const defaultBtnX = isTeam1 ? spawnerX + 90 : spawnerX - 90;

      // Only check for button click if there are players for this team
      if (this.state.players.filter(p => p.team === team).length > 0) {
        if (x >= defaultBtnX - 40 && x <= defaultBtnX + 40 &&
            y >= bottomY - 15 && y <= bottomY + 15) {
          this.setDefaultPositions(team);
          return;
        }
      }
    });

    // Check if we're clicking on the ball
    if (this.checkBallClick(x, y)) return;

    // If not clicking on ball or buttons, try to select a player
    const clickedPlayer = this.findNearestPlayer(x, y);
    if (clickedPlayer) {
      this.state.selectedPlayer = clickedPlayer.id;
      this.state.isBallSelected = false;
      this.isDragging = true;
      this.render();
    }
  }

  private checkBallClick(x: number, y: number): boolean {
    const ballRadius = 20;
    const possessingPlayer = this.state.players.find(p => p.id === this.state.ball.possessionPlayerId);
    if (possessingPlayer) {
      const offset = 25;
      const ballX = possessingPlayer.position.x + offset;
      const ballY = possessingPlayer.position.y - offset;
      const dx = ballX - x;
      const dy = ballY - y;
      const distanceToBall = Math.sqrt(dx * dx + dy * dy);

      if (distanceToBall < ballRadius) {
        this.state.isBallSelected = true;
        this.state.isDraggingBall = true;
        this.state.selectedPlayer = null;
        this.render();
        return true;
      }
    }
    return false;
  }

  public updateDragPosition(x: number, y: number) {
    if (this.state.isDraggingBall) {
      this.state.ball.position = { x, y };
      this.render();
      return;
    }

    if (this.isDragging && this.state.selectedPlayer) {
      const player = this.state.players.find(p => p.id === this.state.selectedPlayer);
      if (player) {
        player.position = { x, y };

        if (this.state.ball.possessionPlayerId === player.id) {
          const offset = 25;
          this.state.ball.position = {
            x: player.position.x + offset,
            y: player.position.y - offset
          };
        }

        this.render();
      }
    }
  }

  public stopDragging() {
    if (this.state.isDraggingBall) {
      const receivingPlayer = this.findNearestPlayer(
        this.state.ball.position.x,
        this.state.ball.position.y
      );

      if (receivingPlayer && receivingPlayer.id !== this.state.ball.possessionPlayerId) {
        this.state.ball.possessionPlayerId = receivingPlayer.id;
        const offset = 25;
        this.state.ball.position = {
          x: receivingPlayer.position.x + offset,
          y: receivingPlayer.position.y - offset
        };

        if (this.state.isRecording) {
          this.recordKeyFrame();
        }
      } else {
        const possessingPlayer = this.state.players.find(
          p => p.id === this.state.ball.possessionPlayerId
        );
        if (possessingPlayer) {
          const offset = 25;
          this.state.ball.position = {
            x: possessingPlayer.position.x + offset,
            y: possessingPlayer.position.y - offset
          };
        } else {
          const nearestPlayer = this.findNearestPlayer(
            this.state.ball.position.x,
            this.state.ball.position.y
          );
          if (nearestPlayer) {
            this.state.ball.possessionPlayerId = nearestPlayer.id;
            const offset = 25;
            this.state.ball.position = {
              x: nearestPlayer.position.x + offset,
              y: nearestPlayer.position.y - offset
            };
          }
        }
      }

      this.state.isDraggingBall = false;
      this.state.isBallSelected = false;
    }

    if (this.isDragging && this.state.isRecording) {
      this.recordKeyFrame();
    }
    this.isDragging = false;
    this.render();
  }

  private findNearestPlayer(x: number, y: number): Player | null {
    let nearest: Player | null = null;
    let minDistance = Infinity;

    this.state.players.forEach(player => {
      const dx = player.position.x - x;
      const dy = player.position.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < minDistance && distance < 20) {
        minDistance = distance;
        nearest = player;
      }
    });

    return nearest;
  }

  public toggleRecording(): boolean {
    this.state.isRecording = !this.state.isRecording;

    if (this.state.isRecording) {
      this.state.keyFrames = [];
    }

    return this.state.isRecording;
  }

  public takeSnapshot() {
    if (!this.state.isRecording) return;

    const positions: Record<string, Position> = {};
    this.state.players.forEach(player => {
      positions[player.id] = { ...player.position };
    });

    this.state.keyFrames.push({
      timestamp: Date.now(),
      positions,
      ball: { ...this.state.ball }
    });
  }


  private recordKeyFrame() {
    const positions: Record<string, Position> = {};
    this.state.players.forEach(player => {
      positions[player.id] = { ...player.position };
    });

    this.state.keyFrames.push({
      timestamp: Date.now(),
      positions,
      ball: { ...this.state.ball }
    });
  }

  public getRecordedKeyFrames() {
    return this.state.keyFrames;
  }

  public loadPlay(play: { keyframes: Array<{ timestamp: number; positions: Record<string, Position>; ball: BallState }> }) {
    this.state.keyFrames = play.keyframes;
    this.currentKeyFrameIndex = 0;
    if (this.state.keyFrames.length > 0) {
      // Set initial positions from first keyframe
      const firstFrame = this.state.keyFrames[0];
      Object.entries(firstFrame.positions).forEach(([playerId, position]) => {
        const player = this.state.players.find(p => p.id === playerId);
        if (player) {
          player.position = position;
        }
      });
      this.state.ball = { ...firstFrame.ball };
    }
    this.render();
  }

  public setPlaybackSpeed(speed: number) {
    this.playbackSpeed = speed;
  }

  public startPlayback() {
    if (this.animationFrameId) return;
    this.lastFrameTime = performance.now();

    const animate = (currentTime: number) => {
      if (this.currentKeyFrameIndex < this.state.keyFrames.length) {
        const deltaTime = currentTime - this.lastFrameTime;

        // Only update frame if enough time has passed based on playback speed
        if (deltaTime >= (1000 / 60) / this.playbackSpeed) {
          const frame = this.state.keyFrames[this.currentKeyFrameIndex];
          Object.entries(frame.positions).forEach(([playerId, position]) => {
            const player = this.state.players.find(p => p.id === playerId);
            if (player) {
              player.position = position;
            }
          });
          this.state.ball = { ...frame.ball };
          this.currentKeyFrameIndex++;
          this.render();
          this.lastFrameTime = currentTime;
        }

        this.animationFrameId = requestAnimationFrame(animate);
      } else {
        this.animationFrameId = null;
      }
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  public pausePlayback() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public resetPlayback() {
    this.pausePlayback();
    this.currentKeyFrameIndex = 0;
    if (this.state.keyFrames.length > 0) {
      const firstFrame = this.state.keyFrames[0];
      Object.entries(firstFrame.positions).forEach(([playerId, position]) => {
        const player = this.state.players.find(p => p.id === playerId);
        if (player) {
          player.position = position;
        }
      });
      this.state.ball = { ...firstFrame.ball };
      this.render();
    }
  }

  private render() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw field
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Field lines
    this.ctx.strokeStyle = 'white';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(50, 50, this.canvas.width - 100, this.canvas.height - 100);

    // Center line
    this.ctx.beginPath();
    this.ctx.moveTo(50, this.canvas.height / 2);
    this.ctx.lineTo(this.canvas.width - 50, this.canvas.height / 2);
    this.ctx.stroke();

    // Draw token spawners and default position buttons
    [1, 2].forEach(team => {
      const isTeam1 = team === 1;
      const spawnerX = isTeam1 ? 50 : this.canvas.width - 50;
      const defaultBtnX = isTeam1 ? spawnerX + 90 : spawnerX - 90;
      const spawnerY = this.canvas.height - 50;
      const buttonY = this.canvas.height - 80; // Default button positioned above the line

      // Draw token spawner
      this.ctx.beginPath();
      this.ctx.arc(spawnerX, spawnerY, this.TOKEN_RADIUS, 0, Math.PI * 2);
      this.ctx.fillStyle = isTeam1 ? 'red' : 'blue';
      this.ctx.fill();

      // Draw + symbol
      this.ctx.strokeStyle = 'white';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(spawnerX - 5, spawnerY);
      this.ctx.lineTo(spawnerX + 5, spawnerY);
      this.ctx.moveTo(spawnerX, spawnerY - 5);
      this.ctx.lineTo(spawnerX, spawnerY + 5);
      this.ctx.stroke();

      // Draw default position button if there are players
      if (this.state.players.filter(p => p.team === team).length > 0) {
        this.ctx.fillStyle = isTeam1 ? 'rgba(255, 0, 0, 0.2)' : 'rgba(0, 0, 255, 0.2)';
        this.ctx.beginPath();
        this.ctx.roundRect(defaultBtnX - 40, buttonY - 15, 80, 30, 5);
        this.ctx.fill();
        this.ctx.strokeStyle = 'white';
        this.ctx.strokeRect(defaultBtnX - 40, buttonY - 15, 80, 30);

        this.ctx.fillStyle = 'white';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('Default', defaultBtnX, buttonY);
      }
    });

    // Draw players
    this.state.players.forEach(player => {
      this.ctx.beginPath();
      this.ctx.arc(player.position.x, player.position.y, this.TOKEN_RADIUS, 0, Math.PI * 2);
      this.ctx.fillStyle = player.team === 1 ? 'red' : 'blue';
      this.ctx.fill();

      if (player.id === this.state.selectedPlayer) {
        this.ctx.strokeStyle = 'yellow';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
      }

      if (player.id === this.state.ball.possessionPlayerId) {
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
      }
    });

    // Draw ball
    this.drawBall();
  }

  private drawBall() {
    const possessingPlayer = this.state.players.find(p => p.id === this.state.ball.possessionPlayerId);
    let ballX = this.state.ball.position.x;
    let ballY = this.state.ball.position.y;

    if (possessingPlayer) {
      const offset = 25;
      ballX = possessingPlayer.position.x + offset;
      ballY = possessingPlayer.position.y - offset;
    }

    this.ctx.beginPath();
    this.ctx.arc(ballX, ballY, 20, 0, Math.PI * 2);
    this.ctx.fillStyle = 'yellow';
    this.ctx.fill();

    if (this.state.isBallSelected) {
      this.ctx.strokeStyle = 'white';
      this.ctx.lineWidth = 3;
      this.ctx.stroke();
    } else {
      this.ctx.strokeStyle = '#cccccc';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    }
  }

  public isRecording(): boolean {
    return this.state.isRecording;
  }

  public setDefaultPositions(team: 1 | 2) {
    // Field dimensions (accounting for margins)
    const fieldLeft = 50;
    const fieldRight = this.canvas.width - 50;
    const fieldTop = 50;
    const fieldMiddle = this.canvas.height / 2;
    const defenseLineY = fieldMiddle - (fieldMiddle - fieldTop) / 2;
    const spacing = (fieldRight - fieldLeft) / 7; // Divide field into 7 sections for 6 players

    // Remove existing players of the specified team
    this.state.players = this.state.players.filter(p => p.team !== team);

    if (team === 1) {
      // Add red team (attack) along the middle line
      for (let i = 0; i < 6; i++) {
        const x = fieldLeft + spacing + (i * spacing);
        const playerId = `team1-${i}`;
        this.state.players.push({
          id: playerId,
          team: 1,
          position: {
            x,
            y: fieldMiddle
          }
        });

        // Give the ball to the third player (index 2)
        if (i === 2) {
          this.state.ball.possessionPlayerId = playerId;
          this.state.ball.position = {
            x: x + 25,
            y: fieldMiddle - 25
          };
        }
      }
    } else {
      // Add blue team (defense) between middle and top
      for (let i = 0; i < 6; i++) {
        this.state.players.push({
          id: `team2-${i}`,
          team: 2,
          position: {
            x: fieldLeft + spacing + (i * spacing),
            y: defenseLineY
          }
        });
      }
    }

    this.render();
  }
}