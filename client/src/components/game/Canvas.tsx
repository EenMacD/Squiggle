import { useEffect, useRef, useState } from "react";
import { GameEngine } from "@/lib/gameEngine";
import { Controls } from "./Controls";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Minus, Trash2 } from "lucide-react";

interface TokenDialogState {
  isOpen: boolean;
  team: 1 | 2;
  count: number;
  mode: 'add' | 'remove';
}

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [gameEngine, setGameEngine] = useState<GameEngine | null>(null);
  const { toast } = useToast();
  const [tokenDialog, setTokenDialog] = useState<TokenDialogState>({
    isOpen: false,
    team: 1,
    count: 0,
    mode: 'add'
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
        if (tokenDialog.mode === 'add') {
          gameEngine.spawnTokens(tokenDialog.team, tokenDialog.count);
        } else {
          gameEngine.removeTokens(tokenDialog.team, tokenDialog.count);
        }
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

    // Click handling for bottom controls
    const controlsY = canvasRef.current.height - 30;
    if (y > controlsY - 20 && y < controlsY + 20) {
      const halfWidth = canvasRef.current.width / 2;
      // Default positions button (left side)
      if (x > halfWidth - 100 && x < halfWidth - 20) {
        if (gameEngine) {
          gameEngine.resetToDefaultPositions();
        }
        return;
      }
      // Bin buttons
      const team1BinX = halfWidth + 20;
      const team2BinX = halfWidth + 60;
      if (x > team1BinX - 15 && x < team1BinX + 15) {
        setTokenDialog({
          isOpen: true,
          team: 1,
          count: 0,
          mode: 'remove'
        });
        return;
      }
      if (x > team2BinX - 15 && x < team2BinX + 15) {
        setTokenDialog({
          isOpen: true,
          team: 2,
          count: 0,
          mode: 'remove'
        });
        return;
      }
    }

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

  const handleTokenAction = () => {
    if (!gameEngine || tokenDialog.count === 0) return;
    if (tokenDialog.mode === 'add') {
      gameEngine.spawnTokens(tokenDialog.team, tokenDialog.count);
    } else {
      gameEngine.removeTokens(tokenDialog.team, tokenDialog.count);
    }
    setTokenDialog(prev => ({ ...prev, isOpen: false, count: 0 }));
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
              {tokenDialog.mode === 'add' ? 'Add' : 'Remove'} {tokenDialog.team === 1 ? "Red" : "Blue"} Players
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
            <Button onClick={handleTokenAction}>
              {tokenDialog.mode === 'add' ? 'Add' : 'Remove'} Players
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}