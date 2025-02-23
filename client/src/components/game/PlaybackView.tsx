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
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  useEffect(() => {
    if (canvasRef.current && containerRef.current) {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      const aspectRatio = 4/3;

      // Match the main canvas responsive sizing logic
      const maxWidth = container.clientWidth - 32;
      const maxHeight = (container.clientHeight - 140) * 0.9;
      const widthFromHeight = maxHeight * aspectRatio;

      const width = Math.min(maxWidth, widthFromHeight);
      const height = width / aspectRatio;

      canvas.width = width;
      canvas.height = height;

      // Initialize game engine and load play
      const engine = new GameEngine(canvas);

      // Load players and initial state from first keyframe
      if (play.keyframes.length > 0) {
        const firstFrame = play.keyframes[0];
        const players = Object.entries(firstFrame.positions).map(([id, position]) => ({
          id,
          team: parseInt(id.split('-')[0].replace('team', '')),
          position,
          number: parseInt(id.split('-')[1]) + 1
        }));

        // Set initial state
        engine.state.players = players;
        engine.state.ball = firstFrame.ball;
      }

      engine.loadPlay(play);
      engineRef.current = engine;
    }

    return () => {
      if (engineRef.current) {
        engineRef.current.pausePlayback();
      }
    };
  }, [play]);

  const togglePlayback = () => {
    if (!engineRef.current) return;

    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      engineRef.current.startPlayback();
    } else {
      engineRef.current.pausePlayback();
    }
  };

  const resetPlayback = () => {
    if (!engineRef.current) return;

    engineRef.current.resetPlayback();
    setIsPlaying(false);
  };

  const changeSpeed = (speed: number) => {
    if (!engineRef.current) return;

    setPlaybackSpeed(speed);
    engineRef.current.setPlaybackSpeed(speed);
  };

  // Update playback state when playback naturally ends
  useEffect(() => {
    const checkPlaybackStatus = () => {
      if (engineRef.current && !engineRef.current.isPlaybackActive() && isPlaying) {
        setIsPlaying(false);
      }
    };

    const interval = setInterval(checkPlaybackStatus, 100);
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div className="relative flex flex-col gap-4 h-full bg-black" ref={containerRef}>
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

      <div className="relative flex-1 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          className="border border-border rounded-lg"
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