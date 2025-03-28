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

      const engine = new GameEngine(canvas);
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

      // Create a new GameEngine instance for export
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = 1280;  // HD width
      exportCanvas.height = 960;  // Keep 4:3 aspect ratio
      const exportEngine = new GameEngine(exportCanvas);
      exportEngine.loadPlay(play); // This will now properly initialize players

      const frames: string[] = [];

      // Generate each frame
      for (let i = 0; i < play.keyframes.length; i++) {
        exportEngine.renderFrame(i);
        const frameData = exportCanvas.toDataURL('image/png');
        const base64Data = frameData.replace(/^data:image\/\w+;base64,/, '');
        const frameName = `frame${i.toString().padStart(4, '0')}.png`;
        await ffmpeg.writeFile(frameName, await fetchFile(new Uint8Array(Buffer.from(base64Data, 'base64'))));
        frames.push(frameName);
      }

      // Apply the correct playback speed.  The speed factor is inverted because FFmpeg's setpts expects a scaling factor.
      const speedFactor = playbackSpeed === 0 ? 0.03 : 1 / playbackSpeed; //Handle 0 speed case

      await ffmpeg.exec([
        '-framerate', '30',
        '-pattern_type', 'sequence',
        '-i', 'frame%04d.png',
        '-vf', `setpts=${speedFactor}*PTS`,
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        'output.mp4'
      ]);

      const data = await ffmpeg.readFile('output.mp4');

      // Cleanup frames
      for (const frame of frames) {
        await ffmpeg.deleteFile(frame);
      }
      await ffmpeg.deleteFile('output.mp4');

      // Download the video
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