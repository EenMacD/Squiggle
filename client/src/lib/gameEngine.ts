export interface Position {
  x: number;
  y: number;
}

export interface KeyFrame {
  timestamp: number;
  ballCarrier: string;
  positions: Record<string, Position>;
}

export interface Player {
  id: string;
  team: 1 | 2;
  position: Position;
  hasBall: boolean;
}

export interface GameState {
  players: Player[];
  selectedPlayer: string | null;
  isRecording: boolean;
  isPlaying: boolean;
  isDraggingBall: boolean;
  keyFrames: KeyFrame[];
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: GameState;
  private socket: WebSocket;
  private ballPosition: Position | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.state = {
      players: this.initializePlayers(),
      selectedPlayer: null,
      isRecording: false,
      isPlaying: false,
      isDraggingBall: false,
      keyFrames: []
    };

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//localhost:5001/ws`;
    this.socket = new WebSocket(wsUrl);

    // Initialize ball with the middle player of team 1
    const initialCarrier = this.state.players.find(p => p.team === 1 && p.hasBall);
    if (initialCarrier) {
      this.ballPosition = { ...initialCarrier.position };
    }

    this.setupWebSocket();
    this.render();
  }

  private initializePlayers(): Player[] {
    const players: Player[] = [];
    const spacing = this.canvas.height / 7;

    // Team 1 (Left side)
    for (let i = 0; i < 6; i++) {
      players.push({
        id: `team1-${i}`,
        team: 1,
        position: {
          x: this.canvas.width * 0.25,
          y: spacing + (i * spacing)
        },
        hasBall: i === 2 // Middle player starts with the ball
      });
    }

    // Team 2 (Right side)
    for (let i = 0; i < 6; i++) {
      players.push({
        id: `team2-${i}`,
        team: 2,
        position: {
          x: this.canvas.width * 0.75,
          y: spacing + (i * spacing)
        },
        hasBall: false
      });
    }

    return players;
  }

  public startDraggingBall(x: number, y: number) {
    const ballCarrier = this.state.players.find(p => p.hasBall);
    if (ballCarrier && this.ballPosition) {
      const dx = this.ballPosition.x - x;
      const dy = this.ballPosition.y - y;
      if (Math.sqrt(dx * dx + dy * dy) < 15) {
        this.state.isDraggingBall = true;
        ballCarrier.hasBall = false;
        this.render();
      }
    }
  }

  public updateBallPosition(x: number, y: number) {
    if (this.state.isDraggingBall) {
      this.ballPosition = { x, y };
      this.render();
    }
  }

  public stopDraggingBall(x: number, y: number) {
    if (this.state.isDraggingBall && this.ballPosition) {
      const nearestPlayer = this.findNearestPlayer(x, y);
      if (nearestPlayer) {
        nearestPlayer.hasBall = true;
        this.ballPosition = { ...nearestPlayer.position };

        if (this.state.isRecording) {
          this.recordKeyFrame(nearestPlayer.id);
        }
      }
      this.state.isDraggingBall = false;
      this.render();
    }
  }

  private findNearestPlayer(x: number, y: number): Player | null {
    let nearest: Player | null = null;
    let minDistance = Infinity;

    this.state.players.forEach(player => {
      const dx = player.position.x - x;
      const dy = player.position.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < minDistance && distance < 30) {
        minDistance = distance;
        nearest = player;
      }
    });

    return nearest;
  }

  private recordKeyFrame(ballCarrierId: string) {
    const positions: Record<string, Position> = {};
    this.state.players.forEach(player => {
      positions[player.id] = { ...player.position };
    });

    const keyFrame: KeyFrame = {
      timestamp: Date.now(),
      ballCarrier: ballCarrierId,
      positions
    };

    this.state.keyFrames.push(keyFrame);
  }

  public render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawField();
    this.drawPlayers();
    this.drawBall();
  }

  private drawField() {
    // Black background
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Field lines
    this.ctx.strokeStyle = 'white';
    this.ctx.lineWidth = 2;

    // Border
    this.ctx.strokeRect(50, 50, this.canvas.width - 100, this.canvas.height - 100);

    // Center line
    this.ctx.beginPath();
    this.ctx.moveTo(this.canvas.width / 2, 50);
    this.ctx.lineTo(this.canvas.width / 2, this.canvas.height - 50);
    this.ctx.stroke();
  }

  private drawPlayers() {
    this.state.players.forEach(player => {
      this.ctx.beginPath();
      this.ctx.arc(player.position.x, player.position.y, 15, 0, Math.PI * 2);
      this.ctx.fillStyle = player.team === 1 ? 'red' : 'blue';
      this.ctx.fill();

      if (player.id === this.state.selectedPlayer) {
        this.ctx.strokeStyle = 'yellow';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
      }
    });
  }

  private drawBall() {
    if (this.ballPosition) {
      this.ctx.beginPath();
      this.ctx.arc(this.ballPosition.x, this.ballPosition.y, 8, 0, Math.PI * 2);
      this.ctx.fillStyle = 'white';
      this.ctx.fill();
      this.ctx.strokeStyle = 'black';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }
  }

  private setupWebSocket() {
    this.socket.onmessage = (event) => {
      const update = JSON.parse(event.data);
      this.state = { ...this.state, ...update };
      this.render();
    };
  }

  public toggleRecording() {
    this.state.isRecording = !this.state.isRecording;

    if (this.state.isRecording) {
      this.state.keyFrames = [];
      // Record initial positions
      const ballCarrier = this.state.players.find(p => p.hasBall);
      if (ballCarrier) {
        this.recordKeyFrame(ballCarrier.id);
      }
    }

    return this.state.isRecording;
  }

  public getRecordedKeyFrames(): KeyFrame[] {
    return this.state.keyFrames;
  }

  public loadPlay(play: { keyFrames: KeyFrame[] }) {
    this.state.keyFrames = play.keyFrames;
    if (play.keyFrames.length > 0) {
      // Set initial positions
      const firstFrame = play.keyFrames[0];
      Object.entries(firstFrame.positions).forEach(([playerId, position]) => {
        const player = this.state.players.find(p => p.id === playerId);
        if (player) {
          player.position = position;
          player.hasBall = playerId === firstFrame.ballCarrier;
        }
      });

      if (firstFrame.ballCarrier) {
        const carrier = this.state.players.find(p => p.id === firstFrame.ballCarrier);
        if (carrier) {
          this.ballPosition = { ...carrier.position };
        }
      }
    }
    this.render();
  }

  public startPlayback() {
    if (this.state.isPlaying || this.state.keyFrames.length === 0) return;

    this.state.isPlaying = true;
    let frameIndex = 0;

    const animate = () => {
      if (!this.state.isPlaying || frameIndex >= this.state.keyFrames.length) {
        this.state.isPlaying = false;
        return;
      }

      const frame = this.state.keyFrames[frameIndex];

      // Update player positions
      Object.entries(frame.positions).forEach(([playerId, position]) => {
        const player = this.state.players.find(p => p.id === playerId);
        if (player) {
          player.position = position;
          player.hasBall = playerId === frame.ballCarrier;
          if (player.hasBall) {
            this.ballPosition = { ...position };
          }
        }
      });

      this.render();
      frameIndex++;

      // Add delay between frames
      setTimeout(() => requestAnimationFrame(animate), 1000);
    };

    requestAnimationFrame(animate);
  }
}