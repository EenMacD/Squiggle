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
  public state: GameState;
  private isDragging: boolean = false;
  private playbackInterval: number | null = null;
  private currentKeyFrameIndex: number = 0;
  private animationFrameId: number | null = null;
  private playbackSpeed: number = 1;
  private lastFrameTime: number = 0;
  private readonly TOKEN_RADIUS = 15;
  private readonly SIDELINE_WIDTH = 50;
  private readonly BALL_RADIUS = 15; // Reduced from 20

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;

    const initialBallState: BallState = {
      position: {
        x: canvas.width / 2,
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
    if (existingTeamPlayers + count > 20) {
      count = 20 - existingTeamPlayers; // Allow up to 20 players per team
      if (count <= 0) return;
    }

    const fieldLeft = 50 + this.SIDELINE_WIDTH;
    const fieldRight = this.canvas.width - 50 - this.SIDELINE_WIDTH;
    const fieldWidth = fieldRight - fieldLeft;

    // Y positions for rows with reduced spacing
    const attackBaseY = this.canvas.height - 200; // Bottom half base position
    const defenseBaseY = 150; // Top half base position
    const rowSpacing = 25; // Reduced vertical space between rows

    // Calculate rows and positions
    const playersPerRow = 5;
    const horizontalSpacing = fieldWidth / 10; // 10 segments for 5 players (very close together)

    for (let i = 0; i < count; i++) {
      const row = Math.floor((existingTeamPlayers + i) / playersPerRow);
      const col = (existingTeamPlayers + i) % playersPerRow;

      const playerId = `team${team}-${this.state.players.length}`;
      const x = fieldLeft + horizontalSpacing * (col + 2.5); // Start from middle segments
      const y = team === 1
        ? attackBaseY + (row * rowSpacing)  // Moving down for attack team
        : defenseBaseY - (row * rowSpacing); // Moving up for defense team

      this.state.players.push({
        id: playerId,
        team,
        position: { x, y }
      });

      // Give ball to center attacker if it's the first red team player
      if (team === 1 && this.state.players.filter(p => p.team === 1).length === 1) {
        const offset = 25;
        this.state.ball.possessionPlayerId = playerId;
        this.state.ball.position = {
          x: Math.min(fieldRight - offset, x + offset),
          y: Math.max(150 + offset, y - offset)
        };
      }
    }

    this.render();
  }

  public removePlayersFromTeam(team: 1 | 2, targetCount: number) {
    const teamPlayers = this.state.players.filter(p => p.team === team);
    if (teamPlayers.length <= targetCount) return;

    // Keep first N players (they were added first)
    const playersToKeep = teamPlayers.slice(0, targetCount);
    const keepIds = new Set(playersToKeep.map(p => p.id));

    // Remove all players from this team that aren't in the keep list
    this.state.players = this.state.players.filter(p =>
      p.team !== team || keepIds.has(p.id)
    );

    // If a removed player had the ball, give it to the first remaining red team player
    if (!this.state.players.find(p => p.id === this.state.ball.possessionPlayerId)) {
      const redPlayer = this.state.players.find(p => p.team === 1);
      if (redPlayer) {
        this.state.ball.possessionPlayerId = redPlayer.id;
        const offset = 25;
        this.state.ball.position = {
          x: redPlayer.position.x + offset,
          y: redPlayer.position.y - offset
        };
      } else {
        this.state.ball.possessionPlayerId = null;
        this.state.ball.position = {
          x: this.canvas.width / 2,
          y: this.canvas.height / 2
        };
      }
    }

    this.render();
  }

  public startDragging(x: number, y: number) {
    // Check if we're clicking on the ball
    if (this.checkBallClick(x, y)) return;

    // If not clicking on ball, try to select a player
    const clickedPlayer = this.findNearestPlayer(x, y);
    if (clickedPlayer) {
      this.state.selectedPlayer = clickedPlayer.id;
      this.state.isBallSelected = false;
      this.isDragging = true;
      this.render();
    }
  }

  private checkBallClick(x: number, y: number): boolean {
    const ballRadius = this.BALL_RADIUS;
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
    // Field boundaries
    const fieldLeft = 50 + this.SIDELINE_WIDTH;
    const fieldRight = this.canvas.width - 50 - this.SIDELINE_WIDTH;
    const fieldTop = 50;
    const fieldBottom = this.canvas.height - 100;

    // Constrain coordinates within field boundaries
    const constrainedX = Math.max(fieldLeft + this.TOKEN_RADIUS, Math.min(fieldRight - this.TOKEN_RADIUS, x));
    const constrainedY = Math.max(fieldTop + this.TOKEN_RADIUS, Math.min(fieldBottom - this.TOKEN_RADIUS, y));

    if (this.state.isDraggingBall) {
      this.state.ball.position = { x: constrainedX, y: constrainedY };
      this.render();
      return;
    }

    if (this.isDragging && this.state.selectedPlayer) {
      const player = this.state.players.find(p => p.id === this.state.selectedPlayer);
      if (player) {
        player.position = { x: constrainedX, y: constrainedY };

        if (this.state.ball.possessionPlayerId === player.id) {
          const offset = 25;
          this.state.ball.position = {
            x: Math.min(fieldRight - offset, player.position.x + offset),
            y: Math.max(fieldTop + offset, player.position.y - offset)
          };
        }

        this.render();
      }
    }
  }

  private stopDragging() {
    if (this.state.isDraggingBall) {
      const receivingPlayer = this.findNearestPlayer(
        this.state.ball.position.x,
        this.state.ball.position.y
      );

      if (receivingPlayer && receivingPlayer.team === 1) {
        // Only allow red team to receive the ball
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
        // Return ball to previous red team player
        const redPlayer = this.state.players.find(p => p.team === 1);
        if (redPlayer) {
          this.state.ball.possessionPlayerId = redPlayer.id;
          const offset = 25;
          this.state.ball.position = {
            x: redPlayer.position.x + offset,
            y: redPlayer.position.y - offset
          };
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

    // Draw field background in white
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Sidelines in black
    this.ctx.strokeStyle = 'black';
    this.ctx.lineWidth = 2;

    // Main field rectangle
    this.ctx.strokeRect(
      50 + this.SIDELINE_WIDTH,
      50,
      this.canvas.width - 100 - (this.SIDELINE_WIDTH * 2),
      this.canvas.height - 100
    );

    // Center line
    this.ctx.beginPath();
    this.ctx.moveTo(50 + this.SIDELINE_WIDTH, this.canvas.height / 2);
    this.ctx.lineTo(this.canvas.width - 50 - this.SIDELINE_WIDTH, this.canvas.height / 2);
    this.ctx.stroke();

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

    // Draw ball with black outline
    this.ctx.beginPath();
    this.ctx.arc(ballX, ballY, this.BALL_RADIUS, 0, Math.PI * 2);
    this.ctx.fillStyle = 'yellow';
    this.ctx.fill();
    this.ctx.strokeStyle = 'black';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    if (this.state.isBallSelected) {
      this.ctx.beginPath();
      this.ctx.arc(ballX, ballY, this.BALL_RADIUS + 2, 0, Math.PI * 2);
      this.ctx.strokeStyle = 'white';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }
  }

  public isRecording(): boolean {
    return this.state.isRecording;
  }

  private setDefaultPositions(team: 1 | 2) {
    const fieldLeft = 50 + this.SIDELINE_WIDTH;
    const fieldRight = this.canvas.width - 50 - this.SIDELINE_WIDTH;
    const fieldWidth = fieldRight - fieldLeft;
    const fieldTop = 50;
    const fieldBottom = this.canvas.height - 100;

    // Get existing players for this team
    const teamPlayers = this.state.players.filter(p => p.team === team);
    const playerCount = teamPlayers.length;

    if (playerCount === 0) return;

    // Remove existing players of the specified team
    this.state.players = this.state.players.filter(p => p.team !== team);

    // Position first 6 players on field in a line
    const mainLineSpacing = fieldWidth / 7; // 7 segments for 6 players
    const mainLineY = team === 1 ? fieldBottom - 100 : fieldTop + 100;

    const mainLineCount = Math.min(6, playerCount);
    for (let i = 0; i < mainLineCount; i++) {
      const x = fieldLeft + mainLineSpacing * (i + 1);
      const playerId = `team${team}-${i}`;

      this.state.players.push({
        id: playerId,
        team,
        position: { x, y: mainLineY }
      });

      // Give ball to center player (3rd player) of attack team
      if (team === 1 && i === 2) {
        this.state.ball.possessionPlayerId = playerId;
        const offset = 25;
        this.state.ball.position = {
          x: Math.min(fieldRight - offset, x + offset),
          y: Math.max(fieldTop + offset, mainLineY - offset)
        };
      }
    }

    // Position remaining players as substitutes in rows of 2
    if (playerCount > 6) {
      const remainingPlayers = playerCount - 6;
      const subsPerRow = 2;
      const rowCount = Math.ceil(remainingPlayers / subsPerRow);
      // Position subs closer to touchlines (30 pixels from sideline)
      const sidelineX = team === 1 ? fieldLeft - 30 : fieldRight + 30;

      for (let i = 0; i < remainingPlayers; i++) {
        const row = Math.floor(i / subsPerRow);
        const col = i % subsPerRow;
        const spacing = 40; // Space between substitute players

        this.state.players.push({
          id: `team${team}-${i + 6}`,
          team,
          position: {
            x: sidelineX + (col * spacing) * (team === 1 ? 1 : -1),
            y: fieldTop + 150 + (row * spacing)
          }
        });
      }
    }

    this.render();
  }

  // Add this method to the GameEngine class
  public isPlaybackActive(): boolean {
    return this.animationFrameId !== null && this.currentKeyFrameIndex < this.state.keyFrames.length;
  }
}