import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { GameEngine } from "@/lib/gameEngine";
import type { Play } from "@shared/schema";

interface PlaybackViewProps {
  play: Play;
  onClose: () => void;
}

export function PlaybackView({ play, onClose }: PlaybackViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const aspectRatio = 4/3;
      canvas.width = 800;
      canvas.height = canvas.width / aspectRatio;

      engineRef.current = new GameEngine(canvas);
      engineRef.current.loadPlay(play);
    }
  }, [play]);

  return (
    <div className="relative flex flex-col gap-4">
      <Button 
        variant="ghost" 
        size="icon"
        className="absolute top-2 right-2 z-10"
        onClick={onClose}
      >
        <X className="h-4 w-4" />
      </Button>

      <canvas
        ref={canvasRef}
        className="w-full border border-border rounded-lg bg-black"
      />
    </div>
  );
}