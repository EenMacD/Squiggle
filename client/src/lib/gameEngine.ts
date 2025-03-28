export interface Position {
  x: number;
  y: number;
}

export interface Player {
  id: string;
  team: 1 | 2;
  position: Position;
  number?: number;  // Optional number for the player
}

export interface BallState {
  position: Position;
  possessionPlayerId: string | null;
}

export interface PlayerPath {
  startPos: Position;
  endPos: Position;
  path: Position[];
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
  touchCount: number; // Added touchCount property
  playerPaths: Record<string, PlayerPath>;
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
  private readonly BALL_RADIUS = 10; // Reduced size for better centering

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
      isBallSelected: false,
      touchCount: 0, // Initialize touchCount
      playerPaths: {}
    };

    this.render();
  }

  public spawnTokens(team: 1 | 2, count: number) {
    if (count <= 0) return;

    const existingTeamPlayers = this.state.players.filter(p => p.team === team).length;
    if (existingTeamPlayers + count > 20) {
      count = 20 - existingTeamPlayers;
      if (count <= 0) return;
    }

    const fieldLeft = 50 + this.SIDELINE_WIDTH;
    const fieldRight = this.canvas.width - 50 - this.SIDELINE_WIDTH;
    const fieldWidth = fieldRight - fieldLeft;
    const fieldTop = 50;
    const fieldBottom = this.canvas.height - 100;
    const fieldHeight = fieldBottom - fieldTop;
    const halfwayLine = fieldTop + fieldHeight / 2;

    // Calculate base positions exactly in middle of respective halves
    const attackBaseY = halfwayLine + (fieldHeight / 4); // Middle of bottom half
    const defenseBaseY = halfwayLine - (fieldHeight / 4); // Middle of top half
    const spacing = 40; // Base spacing value for both directions

    // Calculate rows and positions
    const playersPerRow = 5;
    const horizontalSpacing = spacing * 0.8; // Slightly tighter horizontal spacing

    for (let i = 0; i < count; i++) {
      const row = Math.floor((existingTeamPlayers + i) / playersPerRow);
      const col = (existingTeamPlayers + i) % playersPerRow;

      const playerId = `team${team}-${this.state.players.length}`;

      // Center the group horizontally in the field
      const totalWidth = (playersPerRow - 1) * horizontalSpacing;
      const startX = fieldLeft + (fieldWidth - totalWidth) / 2;
      const x = startX + horizontalSpacing * col;

      // Vertically position relative to the half's center
      const y = team === 1
        ? attackBaseY + (row * spacing - Math.floor(count / playersPerRow) * spacing / 2)  // Center in attack half
        : defenseBaseY + (row * spacing - Math.floor(count / playersPerRow) * spacing / 2); // Center in defense half

      this.state.players.push({
        id: playerId,
        team,
        position: { x, y },
        number: this.state.players.filter(p => p.team === team).length + 1  // Start numbering from 1 for each team
      });

      // Give ball to center attacker if it's the first red team player
      if (team === 1 && this.state.players.filter(p => p.team === 1).length === 1) {
        this.state.ball.possessionPlayerId = playerId;
        this.state.ball.position = {
          x: x,
          y: y
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

  private dragPath: Position[] = [];

  public startDragging(x: number, y: number) {
    // Check if we're clicking on the ball
    if (this.checkBallClick(x, y)) return;

    // If not clicking on ball, try to select a player
    const clickedPlayer = this.findNearestPlayer(x, y);
    if (clickedPlayer) {
      this.state.selectedPlayer = clickedPlayer.id;
      this.state.isBallSelected = false;
      this.isDragging = true;
      this.dragPath = [{ x, y }];
      this.state.playerPaths[clickedPlayer.id] = {
        startPos: { ...clickedPlayer.position },
        endPos: { ...clickedPlayer.position },
        path: this.dragPath
      };
      this.render();
    }
  }

  private checkBallClick(x: number, y: number): boolean {
    const ballRadius = this.BALL_RADIUS;
    const possessingPlayer = this.state.players.find(p => p.id === this.state.ball.possessionPlayerId);

    // Get ball position (either centered on player or at its current position)
    const ballX = possessingPlayer ? possessingPlayer.position.x : this.state.ball.position.x;
    const ballY = possessingPlayer ? possessingPlayer.position.y : this.state.ball.position.y;

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

    if (this.isDragging && this.dragPath) {
      this.dragPath.push({ x: constrainedX, y: constrainedY });
    }

    if (this.state.isDraggingBall) {
      // Allow ball to be dragged freely
      this.state.ball.position = { x: constrainedX, y: constrainedY };
      // Release ball from player possession while dragging
      this.state.ball.possessionPlayerId = null;
      this.render();
      return;
    }

    if (this.isDragging && this.state.selectedPlayer) {
      const player = this.state.players.find(p => p.id === this.state.selectedPlayer);
      if (player) {
        player.position = { x: constrainedX, y: constrainedY };
        this.state.playerPaths[player.id].endPos = { x: constrainedX, y: constrainedY };

        // If player has ball possession, move ball with player
        if (this.state.ball.possessionPlayerId === player.id) {
          this.state.ball.position = {
            x: player.position.x,
            y: player.position.y
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

      if (receivingPlayer && receivingPlayer.team === 1) {
        // Only allow red team to receive the ball
        this.state.ball.possessionPlayerId = receivingPlayer.id;
        this.state.ball.position = {
          x: receivingPlayer.position.x,
          y: receivingPlayer.position.y
        };

        if (this.state.isRecording) {
          this.recordKeyFrame();
        }
      } else {
        // Return ball to previous red team player
        const redPlayer = this.state.players.find(p => p.team === 1);
        if (redPlayer) {
          this.state.ball.possessionPlayerId = redPlayer.id;
          this.state.ball.position = {
            x: redPlayer.position.x,
            y: redPlayer.position.y
          };
        }
      }

      this.state.isDraggingBall = false;
      this.state.isBallSelected = false;
    }

    if (this.isDragging && this.state.selectedPlayer) {
      const player = this.state.players.find(p => p.id === this.state.selectedPlayer);
      if (player) {
        // Save the end position and path
        this.state.playerPaths[player.id].endPos = { ...player.position };
        this.state.playerPaths[player.id].path = [...this.dragPath];
        // Reset player to start position
        player.position = { ...this.state.playerPaths[player.id].startPos };
      }
    }
    this.isDragging = false;
    this.dragPath = [];
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
      this.state.playerPaths = {};
    } else {
      // Clear all paths when recording stops
      this.state.playerPaths = {};
      this.render();
    }

    return this.state.isRecording;
  }

  public takeSnapshot() {
    if (!this.state.isRecording) return;

    // First update all player positions to their end positions
    this.state.players.forEach(player => {
      if (this.state.playerPaths[player.id]?.endPos) {
        player.position = { ...this.state.playerPaths[player.id].endPos };
      }
    });

    // Then record the positions for the keyframe
    const positions: Record<string, Position> = {};
    this.state.players.forEach(player => {
      positions[player.id] = { ...player.position };
    });

    // Clear the paths after recording positions
    this.state.playerPaths = {};

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
      ball: { ...this.state.ball },
      touchCount: this.state.touchCount
    });
  }

  public getRecordedKeyFrames() {
    return this.state.keyFrames;
  }

  public loadPlay(play: { keyframes: Array<{ timestamp: number; positions: Record<string, Position>; ball: BallState }> }) {
    this.state.keyFrames = play.keyframes;
    this.currentKeyFrameIndex = 0;

    // Initialize state from first keyframe
    if (this.state.keyFrames.length > 0) {
      const firstFrame = this.state.keyFrames[0];

      // Initialize players with proper team assignments and numbers
      this.state.players = Object.entries(firstFrame.positions).map(([id, position]) => {
        const [teamStr, numStr] = id.split('-');
        return {
          id,
          team: parseInt(teamStr.replace('team', '')) as 1 | 2,
          position: { ...position },
          number: parseInt(numStr)
        };
      });

      // Set initial ball state
      this.state.ball = { ...firstFrame.ball };

      // Reset interaction states
      this.state.selectedPlayer = null;
      this.state.isDraggingBall = false;
      this.state.isBallSelected = false;
    }

    // Render initial state
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

  public render() {
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

    // Draw recorded paths only when recording
    if (this.state.isRecording) {
      Object.entries(this.state.playerPaths).forEach(([id, pathData]) => {
        if (pathData.path && pathData.path.length > 1) {
          this.ctx.beginPath();
          this.ctx.moveTo(pathData.path[0].x, pathData.path[0].y);
          for (let i = 1; i < pathData.path.length; i++) {
            this.ctx.lineTo(pathData.path[i].x, pathData.path[i].y);
          }
          this.ctx.strokeStyle = 'black';
          this.ctx.lineWidth = 2;
          this.ctx.stroke();
        }
      });
    }

    // Draw current drag path
    if (this.isDragging && this.dragPath && this.dragPath.length > 1) {
      this.ctx.beginPath();
      this.ctx.moveTo(this.dragPath[0].x, this.dragPath[0].y);
      for (let i = 1; i < this.dragPath.length; i++) {
        this.ctx.lineTo(this.dragPath[i].x, this.dragPath[i].y);
      }
      this.ctx.strokeStyle = 'black';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }

    // Draw players
    this.state.players.forEach(player => {
      this.ctx.beginPath();
      this.ctx.arc(player.position.x, player.position.y, this.TOKEN_RADIUS, 0, Math.PI * 2);
      this.ctx.fillStyle = player.team === 1 ? 'red' : 'blue';
      this.ctx.fill();

      // Black outline for selected player
      if (player.id === this.state.selectedPlayer) {
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
      }

      // Simple white outline for possession
      if (player.id === this.state.ball.possessionPlayerId) {
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
      }

      // Draw player number if exists
      if (player.number !== undefined) {
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = 'black';
        // Adjust offsets - red numbers just below circle, blue numbers closer to circle
        const redOffset = this.TOKEN_RADIUS + 12; // Just below the circle
        const blueOffset = -(this.TOKEN_RADIUS + 8); // Closer to the circle for blue team
        const numberY = player.position.y + (player.team === 1 ? redOffset : blueOffset);
        this.ctx.fillText(player.number.toString(), player.position.x, numberY);
      }
    });

    this.drawBall();

    //Add touch count display (replace with actual UI element placement)
    this.ctx.save();
    this.ctx.font = '16px Arial';
    this.ctx.fillStyle = 'black';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`Touch: ${this.state.touchCount}`, 20, 30);
    this.ctx.restore();

  }

  private drawBall() {
    const possessingPlayer = this.state.players.find(p => p.id === this.state.ball.possessionPlayerId);
    let ballX = this.state.ball.position.x;
    let ballY = this.state.ball.position.y;

    // Center ball on possessing player
    if (possessingPlayer && !this.state.isDraggingBall) {
      ballX = possessingPlayer.position.x;
      ballY = possessingPlayer.position.y;
    }

    // Draw ball with default black outline
    this.ctx.beginPath();
    this.ctx.arc(ballX, ballY, this.BALL_RADIUS, 0, Math.PI * 2);
    this.ctx.fillStyle = 'yellow';
    this.ctx.fill();
    this.ctx.strokeStyle = 'black';
    this.ctx.lineWidth = this.state.isBallSelected ? 2 : 1;
    this.ctx.stroke();
  }

  public isRecording(): boolean {
    return this.state.isRecording;
  }

  public setPlayerNumber(playerId: string, number: number) {
    if (number < 1 || number > 100) return; // Validate number range
    const player = this.state.players.find(p => p.id === playerId);
    if (player) {
      player.number = number;
      this.render();
    }
  }

  public setDefaultPositions(team: 1 | 2) {
    const fieldLeft = 50 + this.SIDELINE_WIDTH;
    const fieldRight = this.canvas.width - 50 - this.SIDELINE_WIDTH;
    const fieldWidth = fieldRight - fieldLeft;
    const fieldTop = 50;
    const fieldBottom = this.canvas.height - 100;
    const fieldHeight = fieldBottom - fieldTop;
    const halfwayLine = fieldTop + fieldHeight / 2;

    const teamPlayers = this.state.players.filter(p => p.team === team);
    const playerCount = teamPlayers.length;

    if (playerCount === 0) return;

    this.state.players = this.state.players.filter(p => p.team !== team);

    // Position first 6 players on field in a line
    const mainLineSpacing = fieldWidth / 7;
    // Calculate y-position: further apart based on team and number height
    const numberOffset = 30; // Space for numbers
    const mainLineY = team === 1
      ? halfwayLine + 100  // Red team 100px below halfway line (increased spacing)
      : halfwayLine - 100;  // Blue team 100px above halfway line (increased spacing)

    const mainLineCount = Math.min(6, playerCount);
    for (let i = 0; i < mainLineCount; i++) {
      const x = fieldLeft + mainLineSpacing * (i + 1);
      const playerId = `team${team}-${i}`;

      this.state.players.push({
        id: playerId,
        team,
        position: { x, y: mainLineY },
        number: i + 1
      });

      if (team === 1 && i === 2) {
        this.state.ball.possessionPlayerId = playerId;
        this.state.ball.position = {
          x: x,
          y: mainLineY
        };
      }
    }

    // Position remaining players as substitutes closer to sidelines
    if (playerCount > 6) {
      const remainingPlayers = playerCount - 6;
      const subsPerRow = 2;
      const rowCount = Math.ceil(remainingPlayers / subsPerRow);
      const sidelineOffset = 20; // Distance from sideline

      // Position subs outside their respective sidelines
      const sidelineX = team === 1
        ? fieldLeft - sidelineOffset
        : fieldRight + sidelineOffset;

      for (let i = 0; i < remainingPlayers; i++) {
        const row = Math.floor(i / subsPerRow);
        const col = i % subsPerRow;
        const spacing = 60; // Increased vertical spacing

        // Both columns should be outside the sideline
        const xOffset = col * spacing * (team === 1 ? -1 : 1); // Negative for team 1, positive for team 2

        this.state.players.push({
          id: `team${team}-${i + 6}`,
          team,
          position: {
            x: sidelineX + xOffset,
            y: fieldTop + 150 + (row * spacing) // Increased vertical spacing
          },
          number: i + 7
        });
      }
    }

    this.render();
  }

  // Add this method to the GameEngine class
  public prepareStateForExport(keyframe: typeof this.state.keyFrames[0]) {
    // Initialize players from keyframe
    this.state.players = Object.entries(keyframe.positions).map(([id, position]) => {
      const [teamStr, numStr] = id.split('-');
      return {
        id,
        team: parseInt(teamStr.replace('team', '')) as 1 | 2,
        position: { ...position },
        number: parseInt(numStr)
      };
    });

    // Set ball state
    this.state.ball = { ...keyframe.ball };

    // Reset selection states
    this.state.selectedPlayer = null;
    this.state.isDraggingBall = false;
    this.state.isBallSelected = false;
  }

  // Update the renderFrame method to properly handle state
  public renderFrame(frameIndex: number) {
    if (frameIndex >= this.state.keyFrames.length) return;

    const frame = this.state.keyFrames[frameIndex];

    // Ensure proper state initialization for first frame
    if (frameIndex === 0) {
      this.prepareStateForExport(frame);
    }

    // Update positions while maintaining player properties
    Object.entries(frame.positions).forEach(([playerId, position]) => {
      const player = this.state.players.find(p => p.id === playerId);
      if (player) {
        player.position = { ...position };
      }
    });

    // Update ball state
    this.state.ball = { ...frame.ball };

    // Render the frame
    this.render();
  }

  public isPlaybackActive(): boolean {
    return this.animationFrameId !== null && this.currentKeyFrameIndex < this.state.keyFrames.length;
  }

  public getState(): GameState {
    return this.state;
  }

  public incrementTouch(): void {
    this.state.touchCount++;
    this.render();
    if (this.state.isRecording) {
      this.recordKeyFrame();
    }
  }
}