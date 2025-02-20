import { useEffect, useRef } from "react";
import { GameEngine } from "@/lib/gameEngine";

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      engineRef.current = new GameEngine(canvasRef.current);
    }
  }, []);

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
    
    engineRef.current.updatePlayerPosition(x, y);
  };

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      className="w-full h-full border border-border rounded-lg"
      onClick={handleCanvasClick}
      onMouseMove={handleCanvasMouseMove}
    />
  );
}
