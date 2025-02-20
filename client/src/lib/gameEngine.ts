export interface Position {
  x: number;
  y: number;
}

export interface Player {
  id: string;
  team: 1 | 2;
  position: Position;
  trail: Position[];
  hasBall: boolean;
}

export interface GameState {
  players: Player[];
  selectedPlayer: string | null;
  isRecording: boolean;
  isPlaying: boolean;
  isDragging: boolean;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: GameState;
  private socket: WebSocket;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.state = {
      players: this.initializePlayers(),
      selectedPlayer: null,
      isRecording: false,
      isPlaying: false,
      isDragging: false
    };

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    this.socket = new WebSocket(wsUrl);

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
        trail: [],
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
        trail: [],
        hasBall: false
      });
    }

    return players;
  }

  private setupWebSocket() {
    this.socket.onmessage = (event) => {
      const update = JSON.parse(event.data);
      this.state = { ...this.state, ...update };
      this.render();
    };
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
      // Draw trail
      if (player.trail.length > 0) {
        this.ctx.beginPath();
        this.ctx.moveTo(player.trail[0].x, player.trail[0].y);
        player.trail.forEach(pos => {
          this.ctx.lineTo(pos.x, pos.y);
        });
        this.ctx.strokeStyle = player.team === 1 ? 'rgba(255,0,0,0.5)' : 'rgba(0,0,255,0.5)';
        this.ctx.stroke();
      }

      // Draw player
      this.ctx.beginPath();
      this.ctx.arc(player.position.x, player.position.y, 15, 0, Math.PI * 2);
      this.ctx.fillStyle = player.team === 1 ? 'red' : 'blue';
      this.ctx.fill();

      // Draw ball if player has it
      if (player.hasBall) {
        this.ctx.beginPath();
        this.ctx.arc(player.position.x, player.position.y, 5, 0, Math.PI * 2);
        this.ctx.fillStyle = 'white';
        this.ctx.fill();
      }

      if (player.id === this.state.selectedPlayer) {
        this.ctx.strokeStyle = 'yellow';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
      }
    });
  }

  public startDragging(x: number, y: number) {
    const clickedPlayer = this.state.players.find(p => {
      const dx = p.position.x - x;
      const dy = p.position.y - y;
      return Math.sqrt(dx * dx + dy * dy) < 15;
    });

    if (clickedPlayer) {
      this.state.selectedPlayer = clickedPlayer.id;
      this.state.isDragging = true;
      this.render();
    }
  }

  public stopDragging() {
    this.state.isDragging = false;
  }

  public selectPlayer(x: number, y: number) {
    const clickedPlayer = this.state.players.find(p => {
      const dx = p.position.x - x;
      const dy = p.position.y - y;
      return Math.sqrt(dx * dx + dy * dy) < 15;
    });

    if (clickedPlayer) {
      if (this.state.selectedPlayer) {
        const currentPlayer = this.state.players.find(p => p.id === this.state.selectedPlayer);
        if (currentPlayer?.hasBall && clickedPlayer.team === currentPlayer.team) {
          // Pass the ball
          currentPlayer.hasBall = false;
          clickedPlayer.hasBall = true;
        }
      }
      this.state.selectedPlayer = clickedPlayer.id;
      this.render();
    }
  }

  public toggleRecording() {
    this.state.isRecording = !this.state.isRecording;
    if (this.state.isRecording) {
      // Clear all trails when starting a new recording
      this.state.players.forEach(p => p.trail = []);
    }
    this.render();
  }

  public updatePlayerPosition(x: number, y: number) {
    if (this.state.selectedPlayer && !this.state.isPlaying && this.state.isDragging) {
      const player = this.state.players.find(p => p.id === this.state.selectedPlayer);
      if (player) {
        // Update position
        player.position = { x, y };

        // Record trail if recording is active
        if (this.state.isRecording) {
          player.trail.push({ x, y });
        }

        this.render();
      }
    }
  }
}