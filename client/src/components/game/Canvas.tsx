import { useEffect, useRef } from "react";
import { GameEngine } from "@/lib/gameEngine";
import { Controls } from "./Controls";

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      engineRef.current = new GameEngine(canvasRef.current);
    }
  }, []);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!engineRef.current) return;

    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    engineRef.current.startDragging(x, y);
  };

  const handleCanvasMouseUp = () => {
    if (!engineRef.current) return;
    engineRef.current.stopDragging();
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!engineRef.current) return;

    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    engineRef.current.selectPlayer(x, y);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!engineRef.current) return;

    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (e.buttons === 1) { // Left mouse button is being held down
      engineRef.current.updatePlayerPosition(x, y);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="w-full border border-border rounded-lg bg-black"
        onClick={handleCanvasClick}
        onMouseDown={handleCanvasMouseDown}
        onMouseUp={handleCanvasMouseUp}
        onMouseMove={handleCanvasMouseMove}
      />
      <Controls gameEngine={engineRef.current} />
    </div>
  );
}