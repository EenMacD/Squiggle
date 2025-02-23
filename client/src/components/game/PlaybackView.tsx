import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, PlayIcon, Pause, RotateCcw } from "lucide-react";
import { GameEngine } from "@/lib/gameEngine";
import type { Play as PlayType } from "@shared/schema";

interface PlaybackViewProps {
  play: PlayType;
  onClose: () => void;
}

export function PlaybackView({ play, onClose }: PlaybackViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const aspectRatio = 4/3;
      canvas.width = 1200; // Match main field size
      canvas.height = canvas.width / aspectRatio;

      engineRef.current = new GameEngine(canvas);
      engineRef.current.loadPlay(play);
    }

    return () => {
      if (isPlaying) {
        engineRef.current?.pausePlayback();
      }
    };
  }, [play]);

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
    if (engineRef.current) {
      if (!isPlaying) {
        engineRef.current.startPlayback();
      } else {
        engineRef.current.pausePlayback();
      }
    }
  };

  const resetPlayback = () => {
    if (engineRef.current) {
      engineRef.current.resetPlayback();
      setIsPlaying(false);
    }
  };

  const changeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (engineRef.current) {
      engineRef.current.setPlaybackSpeed(speed);
    }
  };

  return (
    <div className="relative flex flex-col gap-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">{play.name}</h2>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          className="w-full border border-border rounded-lg bg-black"
        />

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col gap-2 items-center">
          <div className="flex gap-2 bg-background/80 backdrop-blur-sm rounded-lg p-2">
            <Button
              variant="secondary"
              size="icon"
              onClick={resetPlayback}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={togglePlayback}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <PlayIcon className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="flex gap-2 bg-background/80 backdrop-blur-sm rounded-lg p-2">
            <Button
              variant={playbackSpeed === 1 ? "secondary" : "ghost"}
              size="sm"
              onClick={() => changeSpeed(1)}
            >
              1x
            </Button>
            <Button
              variant={playbackSpeed === 0.1 ? "secondary" : "ghost"}
              size="sm"
              onClick={() => changeSpeed(0.1)}
            >
              0.1x
            </Button>
            <Button
              variant={playbackSpeed === 0.05 ? "secondary" : "ghost"}
              size="sm"
              onClick={() => changeSpeed(0.05)}
            >
              0.05x
            </Button>
            <Button
              variant={playbackSpeed === 0.01 ? "secondary" : "ghost"}
              size="sm"
              onClick={() => changeSpeed(0.01)}
            >
              0.01x
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}