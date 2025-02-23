import { useEffect, useRef, useState } from "react";
import { GameEngine } from "@/lib/gameEngine";
import { Controls } from "./Controls";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Minus } from "lucide-react";

interface TokenDialogState {
  isOpen: boolean;
  team: 1 | 2;
  count: number;
}

// Add new interface for remove players dialog
interface RemovePlayersDialogState {
  isOpen: boolean;
  team: 1 | 2;
  count: number;
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
    team: 1,
    count: 0
  });

  useEffect(() => {
    if (canvasRef.current && containerRef.current) {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      const aspectRatio = 4/3;

      // Calculate maximum possible width while maintaining aspect ratio
      const maxWidth = container.clientWidth - 32; // Account for padding
      const maxHeight = (container.clientHeight - 140) * 0.9; // Account for controls and padding
      const widthFromHeight = maxHeight * aspectRatio;

      // Use the smaller of the two possible dimensions
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
        const teamPlayers = gameEngine.state.players.filter(p => p.team === team).length;
        setRemovePlayersDialog({
          isOpen: true,
          team: team as 1 | 2,
          count: teamPlayers
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
    if (!gameEngine || removePlayersDialog.count === 0) {
      setRemovePlayersDialog(prev => ({ ...prev, isOpen: false }));
      return;
    }

    // Pass the exact count of players we want to keep
    gameEngine.removePlayersFromTeam(removePlayersDialog.team, removePlayersDialog.count);
    setRemovePlayersDialog(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <div className="h-full flex flex-col gap-2" ref={containerRef}>
      <div className="relative flex-1 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          className="border border-border rounded-lg bg-black"
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleMouseLeave}
        />
      </div>
      <div className="flex justify-center gap-4 py-2">
        {gameEngine && (
          <Controls gameEngine={gameEngine} />
        )}
      </div>

      <Dialog 
        open={tokenDialog.isOpen} 
        onOpenChange={(open) => setTokenDialog(prev => ({ ...prev, isOpen: open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Add {tokenDialog.team === 1 ? "Red" : "Blue"} Players
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
            <Button onClick={handleSpawnTokens}>
              Add Players
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Remove Players Dialog */}
      <Dialog 
        open={removePlayersDialog.isOpen} 
        onOpenChange={(open) => setRemovePlayersDialog(prev => ({ ...prev, isOpen: open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Reduce {removePlayersDialog.team === 1 ? "Red" : "Blue"} Players
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center gap-4 py-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setRemovePlayersDialog(prev => ({
                ...prev,
                count: Math.max(0, prev.count - 1)
              }))}
              disabled={removePlayersDialog.count === 0}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="text-2xl font-bold w-12 text-center">
              {removePlayersDialog.count}
            </span>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemovePlayersDialog(prev => ({ ...prev, isOpen: false }))}
            >
              Cancel
            </Button>
            <Button onClick={handleRemovePlayers}>
              Remove Players
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}