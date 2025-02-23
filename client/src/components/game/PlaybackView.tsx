import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, PlayIcon, Pause, RotateCcw, Download } from "lucide-react";
import { GameEngine } from "@/lib/gameEngine";
import type { Play as PlayType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';

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
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

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

      // Initialize game engine and load play
      const engine = new GameEngine(canvas);

      // Load players and initial state from first keyframe
      if (play.keyframes.length > 0) {
        const firstFrame = play.keyframes[0];
        engine.prepareStateForExport(firstFrame);
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

  const exportVideo = async () => {
    if (!engineRef.current || !canvasRef.current || isExporting) return;

    try {
      setIsExporting(true);
      toast({
        title: "Starting video export",
        description: "Please wait while we generate your video..."
      });

      const ffmpeg = new FFmpeg();
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      // Reset playback to start
      engineRef.current.resetPlayback();

      // Ensure canvas dimensions are optimal for video export
      const exportWidth = 1280; // Standard HD width
      const exportHeight = 960; // Maintain 4:3 aspect ratio
      const originalWidth = canvasRef.current.width;
      const originalHeight = canvasRef.current.height;
      canvasRef.current.width = exportWidth;
      canvasRef.current.height = exportHeight;
      engineRef.current.render(); // Re-render at new size

      // Generate frames
      const frames: string[] = [];
      for (let i = 0; i < play.keyframes.length; i++) {
        engineRef.current.renderFrame(i);
        const frameData = canvasRef.current.toDataURL('image/png');
        const base64Data = frameData.replace(/^data:image\/\w+;base64,/, '');
        const frameName = `frame${i.toString().padStart(4, '0')}.png`;
        await ffmpeg.writeFile(frameName, await fetchFile(new Uint8Array(Buffer.from(base64Data, 'base64'))));
        frames.push(frameName);
      }

      // Generate video from frames using the current playback speed
      await ffmpeg.exec([
        '-framerate', '30',
        '-pattern_type', 'sequence',
        '-i', 'frame%04d.png',
        '-vf', `setpts=${1/playbackSpeed}*PTS`,
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        'output.mp4'
      ]);

      // Get the video data
      const data = await ffmpeg.readFile('output.mp4');

      // Clean up frames
      for (const frame of frames) {
        await ffmpeg.deleteFile(frame);
      }
      await ffmpeg.deleteFile('output.mp4');

      // Restore original canvas dimensions
      canvasRef.current.width = originalWidth;
      canvasRef.current.height = originalHeight;
      engineRef.current.render();

      // Create download link
      const blob = new Blob([data], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${play.name.replace(/\s+/g, '_')}.mp4`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Video exported successfully",
        description: "Your video has been downloaded"
      });
    } catch (error) {
      console.error('Video export error:', error);
      toast({
        title: "Export failed",
        description: "There was an error exporting your video",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
      // Reset the playback state
      engineRef.current?.resetPlayback();
    }
  };

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
            <Button
              variant="secondary"
              size="icon"
              onClick={exportVideo}
              disabled={isExporting}
            >
              <Download className="h-4 w-4" />
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