export interface Position {
  x: number;
  y: number;
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
  keyFrames: Array<{
    timestamp: number;
    positions: Record<string, Position>;
  }>;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: GameState;
  private isDragging: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.state = {
      players: this.initializePlayers(),
      selectedPlayer: null,
      isRecording: false,
      keyFrames: []
    };

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
      this.isDragging = true;
      this.render();
    }
  }

  public updateDragPosition(x: number, y: number) {
    if (this.isDragging && this.state.selectedPlayer) {
      const player = this.state.players.find(p => p.id === this.state.selectedPlayer);
      if (player) {
        player.position = { x, y };
        this.render();
      }
    }
  }

  public stopDragging() {
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
      this.recordKeyFrame(); // Record initial positions
    }

    return this.state.isRecording;
  }

  private recordKeyFrame() {
    const positions: Record<string, Position> = {};
    this.state.players.forEach(player => {
      positions[player.id] = { ...player.position };
    });

    this.state.keyFrames.push({
      timestamp: Date.now(),
      positions
    });
  }

  public getRecordedKeyFrames() {
    return this.state.keyFrames;
  }

  public loadPlay(play: { keyframes: Array<{ timestamp: number; positions: Record<string, Position> }> }) {
    this.state.keyFrames = play.keyframes;
    if (this.state.keyFrames.length > 0) {
      // Set initial positions from first keyframe
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
    this.ctx.moveTo(this.canvas.width / 2, 50);
    this.ctx.lineTo(this.canvas.width / 2, this.canvas.height - 50);
    this.ctx.stroke();

    // Draw players
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
}