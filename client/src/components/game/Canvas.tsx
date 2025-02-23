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

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameEngine, setGameEngine] = useState<GameEngine | null>(null);
  const { toast } = useToast();
  const [tokenDialog, setTokenDialog] = useState<TokenDialogState>({
    isOpen: false,
    team: 1,
    count: 0
  });

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const aspectRatio = 4/3;
      canvas.width = 1200;
      canvas.height = canvas.width / aspectRatio;

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
        gameEngine.spawnTokens(tokenDialog.team);
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

    // Check if clicking on a token counter
    const counterY = canvasRef.current.height - 50;
    [1, 2].forEach(team => {
      const counterX = team === 1 ? 50 : canvasRef.current!.width - 50;
      const dx = x - counterX;
      const dy = y - counterY;
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

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="w-full border border-border rounded-lg bg-black"
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleMouseLeave}
        />
      </div>
      <div className="flex justify-center mt-4">
        {gameEngine && <Controls gameEngine={gameEngine} />}
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
    </div>
  );
}