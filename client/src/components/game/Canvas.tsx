import { useEffect, useRef, useState } from "react";
import { GameEngine } from "@/lib/gameEngine";
import { Controls } from "./Controls";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Plus, Minus, Trash2 } from "lucide-react";

interface TokenDialogState {
  isOpen: boolean;
  team: 1 | 2;
  count: number;
}

interface RemovePlayersDialogState {
  isOpen: boolean;
  team: 1 | 2;
}

interface NumberDialogState {
  isOpen: boolean;
  playerId: string;
  currentNumber: number;
}

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [gameEngine, setGameEngine] = useState<GameEngine | null>(null);
  const { toast } = useToast();
  const [tokenDialog, setTokenDialog] = useState<TokenDialogState>({
    isOpen: false,
    team: 1,
    count: 0
  });
  const [removePlayersDialog, setRemovePlayersDialog] = useState<RemovePlayersDialogState>({
    isOpen: false,
    team: 1
  });
  const [numberDialog, setNumberDialog] = useState<NumberDialogState>({
    isOpen: false,
    playerId: '',
    currentNumber: 1
  });

  useEffect(() => {
    if (canvasRef.current && containerRef.current) {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      const aspectRatio = 4/3;

      const maxWidth = container.clientWidth - 32;
      const maxHeight = (container.clientHeight - 140) * 0.9;
      const widthFromHeight = maxHeight * aspectRatio;

      const width = Math.min(maxWidth, widthFromHeight);
      const height = width / aspectRatio;

      canvas.width = width;
      canvas.height = height;

      const engine = new GameEngine(canvas);
      setGameEngine(engine);
    }
  }, []);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!gameEngine) return;

      if (e.code === 'Space' && gameEngine.isRecording()) {
        e.preventDefault();
        gameEngine.takeSnapshot();
        toast({
          title: "Snapshot taken",
          description: "Player positions have been recorded"
        });
      }

      if (e.code === 'Enter' && tokenDialog.count > 0) {
        gameEngine.spawnTokens(tokenDialog.team, tokenDialog.count);
        setTokenDialog(prev => ({ ...prev, isOpen: false, count: 0 }));
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameEngine, toast, tokenDialog]);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!gameEngine || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Check for player number click
    const clickedPlayer = gameEngine.state.players.find(player => {
      const numberY = player.team === 1 
        ? player.position.y + this.TOKEN_RADIUS + 15  // Further below red players
        : player.position.y - this.TOKEN_RADIUS - 15;  // Further above blue players
      const dx = x - player.position.x;
      const dy = y - numberY;
      return Math.sqrt(dx * dx + dy * dy) < 10;  // Small click area for numbers
    });

    if (clickedPlayer) {
      setNumberDialog({
        isOpen: true,
        playerId: clickedPlayer.id,
        currentNumber: clickedPlayer.number || 1
      });
      return;
    }

    // Check for button clicks at the bottom
    const buttonY = canvasRef.current.height - 30;
    [1, 2].forEach((team: 1 | 2) => {
      const isTeam1 = team === 1;
      const spawnerX = isTeam1 ? 50 : canvasRef.current!.width - 50;
      const defaultBtnX = isTeam1 ? spawnerX + 90 : spawnerX - 90;
      const binBtnX = isTeam1 ? defaultBtnX + 90 : defaultBtnX - 90;

      // Check for default positions button
      if (x >= defaultBtnX - 60 && x <= defaultBtnX + 60 &&
          y >= buttonY - 15 && y <= buttonY + 15) {
        gameEngine.setDefaultPositions(team as 1 | 2);
        return;
      }

      // Check for bin button
      if (x >= binBtnX - 15 && x <= binBtnX + 15 &&
          y >= buttonY - 15 && y <= buttonY + 15) {
        setRemovePlayersDialog({
          isOpen: true,
          team: team as 1 | 2
        });
        return;
      }

      // Check for token spawner
      const spawnerY = canvasRef.current!.height - 50;
      const dx = x - spawnerX;
      const dy = y - spawnerY;
      if (Math.sqrt(dx * dx + dy * dy) < 15) {
        setTokenDialog({
          isOpen: true,
          team: team as 1 | 2,
          count: 0
        });
        return;
      }
    });

    gameEngine.startDragging(x, y);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!gameEngine || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    gameEngine.updateDragPosition(x, y);
  };

  const handleCanvasMouseUp = () => {
    if (!gameEngine) return;
    gameEngine.stopDragging();
  };

  const handleMouseLeave = () => {
    if (!gameEngine) return;
    gameEngine.stopDragging();
  };

  const handleSpawnTokens = () => {
    if (!gameEngine || tokenDialog.count === 0) return;
    gameEngine.spawnTokens(tokenDialog.team, tokenDialog.count);
    setTokenDialog(prev => ({ ...prev, isOpen: false, count: 0 }));
  };

  const handleRemovePlayers = () => {
    if (!gameEngine) {
      setRemovePlayersDialog(prev => ({ ...prev, isOpen: false }));
      return;
    }

    gameEngine.removePlayersFromTeam(removePlayersDialog.team, 0);
    setRemovePlayersDialog(prev => ({ ...prev, isOpen: false }));
  };

  const handleNumberChange = () => {
    if (!gameEngine) return;

    const number = numberDialog.currentNumber;
    if (number >= 1 && number <= 100) {
      gameEngine.setPlayerNumber(numberDialog.playerId, number);
      setNumberDialog(prev => ({ ...prev, isOpen: false }));
    }
  };

  return (
    <div className="h-full flex flex-col gap-2 bg-black" ref={containerRef}>
      <div className="relative flex-1 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          className="border border-border rounded-lg"
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleMouseLeave}
        />
      </div>

      {/* Team Management Buttons Row */}
      <div className="flex flex-col gap-2 items-center py-2">
        {gameEngine && (
          <>
            {/* Team Management Buttons Row */}
            <div className="flex gap-4 w-full justify-center">
              {/* Red Team (Attack) Controls */}
              <div className="flex flex-col gap-2 items-center">
                {gameEngine.state.players.some(p => p.team === 1) && (
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => gameEngine.setDefaultPositions(1)}
                    >
                      Default Positions
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setRemovePlayersDialog({ isOpen: true, team: 1 })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <Button
                  variant="destructive"
                  className="w-32"
                  onClick={() => setTokenDialog({ isOpen: true, team: 1, count: 0 })}
                >
                  Add Attack
                </Button>
              </div>

              {/* Recording Controls */}
              <Controls gameEngine={gameEngine} />

              {/* Blue Team (Defence) Controls */}
              <div className="flex flex-col gap-2 items-center">
                {gameEngine.state.players.some(p => p.team === 2) && (
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => gameEngine.setDefaultPositions(2)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Default Positions
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setRemovePlayersDialog({ isOpen: true, team: 2 })}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <Button
                  className="w-32 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => setTokenDialog({ isOpen: true, team: 2, count: 0 })}
                >
                  Add Defence
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Token Dialog */}
      <Dialog
        open={tokenDialog.isOpen}
        onOpenChange={(open) => setTokenDialog(prev => ({ ...prev, isOpen: open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Add {tokenDialog.team === 1 ? "Attack" : "Defence"} Players
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center gap-4 py-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setTokenDialog(prev => ({
                ...prev,
                count: Math.max(0, prev.count - 1)
              }))}
              disabled={tokenDialog.count === 0}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="text-2xl font-bold w-12 text-center">
              {tokenDialog.count}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setTokenDialog(prev => ({
                ...prev,
                count: Math.min(20, prev.count + 1)
              }))}
              disabled={tokenDialog.count === 20}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTokenDialog(prev => ({ ...prev, isOpen: false }))}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSpawnTokens}
              className={tokenDialog.team === 1 ? "bg-red-600 hover:bg-red-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}
            >
              Add Players
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Players Confirmation Dialog */}
      <Dialog
        open={removePlayersDialog.isOpen}
        onOpenChange={(open) => setRemovePlayersDialog(prev => ({ ...prev, isOpen: open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Remove {removePlayersDialog.team === 1 ? "Attack" : "Defence"} Players
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center">
            <p>Are you sure you want to remove all players from this team?</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemovePlayersDialog(prev => ({ ...prev, isOpen: false }))}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemovePlayers}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Number Edit Dialog */}
      <Dialog
        open={numberDialog.isOpen}
        onOpenChange={(open) => setNumberDialog(prev => ({ ...prev, isOpen: open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Player Number</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center gap-4 py-4">
            <Input
              type="number"
              min={1}
              max={100}
              value={numberDialog.currentNumber}
              onChange={(e) => setNumberDialog(prev => ({
                ...prev,
                currentNumber: Math.min(100, Math.max(1, parseInt(e.target.value) || 1))
              }))}
              className="w-24 text-center"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNumberDialog(prev => ({ ...prev, isOpen: false }))}
            >
              Cancel
            </Button>
            <Button
              onClick={handleNumberChange}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}