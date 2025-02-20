import { useEffect, useRef } from "react";
import { GameEngine } from "@/lib/gameEngine";
import { Controls } from "./Controls";

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      // Set canvas size with correct aspect ratio
      const aspectRatio = 4/3;
      canvas.width = 800;
      canvas.height = canvas.width / aspectRatio;

      engineRef.current = new GameEngine(canvas);
    }
  }, []);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!engineRef.current || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    engineRef.current.startDragging(x, y);
  };

  const handleCanvasMouseUp = () => {
    if (!engineRef.current) return;
    engineRef.current.stopDragging();
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!engineRef.current || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    engineRef.current.selectPlayer(x, y);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!engineRef.current || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    engineRef.current.updatePlayerPosition(x, y);
  };

  const handleMouseLeave = () => {
    if (!engineRef.current) return;
    engineRef.current.stopDragging();
  };

  return (
    <div className="flex flex-col gap-4">
      <canvas
        ref={canvasRef}
        className="w-full border border-border rounded-lg bg-black"
        onClick={handleCanvasClick}
        onMouseDown={handleCanvasMouseDown}
        onMouseUp={handleCanvasMouseUp}
        onMouseMove={handleCanvasMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      <Controls gameEngine={engineRef.current} />
    </div>
  );
}