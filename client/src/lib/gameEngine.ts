export interface Position {
  x: number;
  y: number;
}

export interface KeyFrame {
  timestamp: number;
  positions: Record<string, Position>;
}

export interface Player {
  id: string;
  team: 1 | 2;
  position: Position;
}

export interface GameState {
  players: Player[];
  selectedPlayer: string | null;
  isRecording: boolean;
  isPlaying: boolean;
  keyFrames: KeyFrame[];
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: GameState;
  private socket: WebSocket | null = null;
  private isDraggingPlayer: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.state = {
      players: this.initializePlayers(),
      selectedPlayer: null,
      isRecording: false,
      isPlaying: false,
      keyFrames: []
    };

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
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
        }
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
        }
      });
    }

    return players;
  }

  public startDragging(x: number, y: number) {
    const clickedPlayer = this.findNearestPlayer(x, y);
    if (clickedPlayer) {
      this.state.selectedPlayer = clickedPlayer.id;
      this.isDraggingPlayer = true;
      this.render();
    }
  }

  public updateDragPosition(x: number, y: number) {
    if (this.isDraggingPlayer && this.state.selectedPlayer) {
      const player = this.state.players.find(p => p.id === this.state.selectedPlayer);
      if (player) {
        player.position = { x, y };
        this.render();
      }
    }
  }

  public stopDragging() {
    this.isDraggingPlayer = false;
    if (this.state.isRecording) {
      this.recordKeyFrame();
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

  private recordKeyFrame() {
    const positions: Record<string, Position> = {};
    this.state.players.forEach(player => {
      positions[player.id] = { ...player.position };
    });

    const keyFrame: KeyFrame = {
      timestamp: Date.now(),
      positions
    };

    this.state.keyFrames.push(keyFrame);
  }

  public render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawField();
    this.drawPlayers();
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
      setTimeout(() => this.setupWebSocket(), 5000);
    };

    this.socket.onclose = () => {
      console.log('WebSocket connection closed');
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
      this.recordKeyFrame();
    }

    return this.state.isRecording;
  }

  public getRecordedKeyFrames(): KeyFrame[] {
    return this.state.keyFrames;
  }

  public loadPlay(play: { keyframes: KeyFrame[] }) {
    this.state.keyFrames = play.keyframes;
    if (this.state.keyFrames.length > 0) {
      const firstFrame = this.state.keyFrames[0];
      Object.entries(firstFrame.positions).forEach(([playerId, position]) => {
        const player = this.state.players.find(p => p.id === playerId);
        if (player) {
          player.position = position;
        }
      });
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
        if (frameIndex >= this.state.keyFrames.length) {
          frameIndex = 0;
          this.loadPlay({ keyframes: this.state.keyFrames });
        }
        return;
      }

      const frame = this.state.keyFrames[frameIndex];

      Object.entries(frame.positions).forEach(([playerId, position]) => {
        const player = this.state.players.find(p => p.id === playerId);
        if (player) {
          player.position = { ...position };
        }
      });

      this.render();
      frameIndex++;

      setTimeout(() => requestAnimationFrame(animate), 500);
    };

    requestAnimationFrame(animate);
  }
}