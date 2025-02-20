import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, PlayCircle, X } from "lucide-react";
import { GameEngine } from "@/lib/gameEngine";
import type { Play as PlayType } from "@shared/schema";

interface PlaybackViewProps {
  play: PlayType;
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
      // Load the play directly with keyframes
      engineRef.current.loadPlay(play);
    }
  }, [play]);

  const handlePlayback = () => {
    if (engineRef.current) {
      engineRef.current.startPlayback();
    }
  };

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

      <div className="flex justify-center">
        <Button 
          size="lg"
          onClick={handlePlayback}
        >
          <PlayCircle className="h-6 w-6 mr-2" />
          Play
        </Button>
      </div>
    </div>
  );
}