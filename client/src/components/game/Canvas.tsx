import { useEffect, useRef, useState } from "react";
import { GameEngine } from "@/lib/gameEngine";
import { Controls } from "./Controls";

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameEngine, setGameEngine] = useState<GameEngine | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const aspectRatio = 4/3;
      canvas.width = 800;
      canvas.height = canvas.width / aspectRatio;

      const engine = new GameEngine(canvas);
      setGameEngine(engine);
    }
  }, []);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!gameEngine || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    gameEngine.startDraggingBall(x, y);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!gameEngine || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    gameEngine.updateBallPosition(x, y);
  };

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!gameEngine || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    gameEngine.stopDraggingBall(x, y);
  };

  const handleMouseLeave = () => {
    if (!gameEngine || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    gameEngine.stopDraggingBall(
      gameEngine.getLastBallPosition().x,
      gameEngine.getLastBallPosition().y
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <canvas
        ref={canvasRef}
        className="w-full border border-border rounded-lg bg-black"
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleMouseLeave}
      />
      {gameEngine && <Controls gameEngine={gameEngine} />}
    </div>
  );
}