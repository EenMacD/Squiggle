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
  private socket: WebSocket | null = null; // Initialize socket as null
  private ballPosition: Position | null = null;
  private isDraggingPlayer: boolean = false;

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
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    this.setupWebSocket(); //Call setupWebSocket here

    // Initialize ball with the middle player of team 1
    const initialCarrier = this.state.players.find(p => p.team === 1 && p.hasBall);
    if (initialCarrier) {
      this.ballPosition = { ...initialCarrier.position };
    }

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

  public startDragging(x: number, y: number) {
    // First check if we're clicking on the ball
    if (this.ballPosition) {
      const dx = this.ballPosition.x - x;
      const dy = this.ballPosition.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 30) {
        const ballCarrier = this.state.players.find(p => p.hasBall);
        if (ballCarrier) {
          ballCarrier.hasBall = false;
          this.state.isDraggingBall = true;
          this.render();
          return;
        }
      }
    }

    // If not clicking the ball, check for player selection
    const clickedPlayer = this.findNearestPlayer(x, y);
    if (clickedPlayer) {
      this.state.selectedPlayer = clickedPlayer.id;
      this.isDraggingPlayer = true;
      this.render();
    }
  }

  public updateDragPosition(x: number, y: number) {
    if (this.state.isDraggingBall) {
      this.ballPosition = { x, y };
      this.render();
    } else if (this.isDraggingPlayer && this.state.selectedPlayer) {
      const player = this.state.players.find(p => p.id === this.state.selectedPlayer);
      if (player) {
        player.position = { x, y };
        if (player.hasBall && this.ballPosition) {
          this.ballPosition = { x: player.position.x + 10, y: player.position.y - 10 };
        }
        this.render();
      }
    }
  }

  public stopDragging(x: number, y: number) {
    if (this.state.isDraggingBall) {
      const nearestPlayer = this.findNearestPlayer(x, y);
      if (nearestPlayer) {
        nearestPlayer.hasBall = true;
        this.ballPosition = {
          x: nearestPlayer.position.x + 10,
          y: nearestPlayer.position.y - 10
        };

        if (this.state.isRecording) {
          this.recordKeyFrame(nearestPlayer.id);
        }
      }
      this.state.isDraggingBall = false;
    }

    this.isDraggingPlayer = false;
    if (this.state.isRecording) {
      const ballCarrier = this.state.players.find(p => p.hasBall);
      if (ballCarrier) {
        this.recordKeyFrame(ballCarrier.id);
      }
    }

    this.render();
  }

  private findNearestPlayer(x: number, y: number): Player | null {
    let nearest: Player | null = null;
    let minDistance = Infinity;

    this.state.players.forEach(player => {
      const dx = player.position.x - x;
      const dy = player.position.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < minDistance && distance < 50) {
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
    this.updateBallVisualization();
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
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    console.log('Connecting to WebSocket:', wsUrl);

    if (this.socket) {
      this.socket.close();
    }

    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      console.log('WebSocket connection established');
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      // Attempt to reconnect after a delay
      setTimeout(() => this.setupWebSocket(), 5000);
    };

    this.socket.onclose = () => {
      console.log('WebSocket connection closed');
      // Attempt to reconnect after a delay
      setTimeout(() => this.setupWebSocket(), 5000);
    };

    this.socket.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data);
        this.state = { ...this.state, ...update };
        this.render();
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
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
          this.ballPosition = {
            x: carrier.position.x + 10,
            y: carrier.position.y - 10
          };
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
            this.ballPosition = {
              x: position.x + 10,
              y: position.y - 10
            };
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

  private updateBallVisualization() {
    if (!this.state.isDraggingBall) {
      const ballCarrier = this.state.players.find(p => p.hasBall);
      if (ballCarrier) {
        this.ballPosition = {
          x: ballCarrier.position.x + 10,
          y: ballCarrier.position.y - 10
        };
      }
    }
  }
}