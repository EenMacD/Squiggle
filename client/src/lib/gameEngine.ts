export interface Position {
  x: number;
  y: number;
}

export interface Player {
  id: string;
  team: 1 | 2;
  position: Position;
  trail: Position[];
}

export interface GameState {
  players: Player[];
  ball: Position;
  selectedPlayer: string | null;
  isRecording: boolean;
  isPlaying: boolean;
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
      ball: { x: this.canvas.width / 2, y: this.canvas.height / 2 },
      selectedPlayer: null,
      isRecording: false,
      isPlaying: false
    };

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    this.socket = new WebSocket(wsUrl);

    this.setupWebSocket();
    this.render();
  }

  private initializePlayers(): Player[] {
    const players: Player[] = [];
    const positions = [
      { x: 200, y: 200 }, { x: 300, y: 200 }, { x: 400, y: 200 },
      { x: 200, y: 400 }, { x: 300, y: 400 }, { x: 400, y: 400 }
    ];

    // Team 1
    positions.forEach((pos, i) => {
      players.push({
        id: `team1-${i}`,
        team: 1,
        position: { ...pos },
        trail: []
      });
    });

    // Team 2
    positions.forEach((pos, i) => {
      players.push({
        id: `team2-${i}`,
        team: 2,
        position: { x: this.canvas.width - pos.x, y: pos.y },
        trail: []
      });
    });

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
    this.drawBall();
  }

  private drawField() {
    this.ctx.fillStyle = '#3a8c3a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw field lines
    this.ctx.strokeStyle = 'white';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(50, 50, this.canvas.width - 100, this.canvas.height - 100);
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
      
      if (player.id === this.state.selectedPlayer) {
        this.ctx.strokeStyle = 'yellow';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
      }
    });
  }

  private drawBall() {
    this.ctx.beginPath();
    this.ctx.arc(this.state.ball.x, this.state.ball.y, 8, 0, Math.PI * 2);
    this.ctx.fillStyle = 'white';
    this.ctx.fill();
  }

  public selectPlayer(x: number, y: number) {
    const player = this.state.players.find(p => {
      const dx = p.position.x - x;
      const dy = p.position.y - y;
      return Math.sqrt(dx * dx + dy * dy) < 15;
    });
    
    if (player) {
      this.state.selectedPlayer = player.id;
      this.render();
    }
  }

  public toggleRecording() {
    this.state.isRecording = !this.state.isRecording;
    if (this.state.isRecording) {
      this.state.players.forEach(p => p.trail = []);
    }
  }

  public updatePlayerPosition(x: number, y: number) {
    if (this.state.selectedPlayer && !this.state.isPlaying) {
      const player = this.state.players.find(p => p.id === this.state.selectedPlayer);
      if (player) {
        player.position = { x, y };
        if (this.state.isRecording) {
          player.trail.push({ x, y });
        }
        this.render();
      }
    }
  }

  public moveBall(x: number, y: number) {
    this.state.ball = { x, y };
    this.render();
  }
}
