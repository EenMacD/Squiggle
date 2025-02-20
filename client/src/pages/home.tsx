import { Canvas } from "@/components/game/Canvas";
import { Controls } from "@/components/game/Controls";
import { PlayLibrary } from "@/components/game/PlayLibrary";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex">
      <div className="w-64 border-r border-border p-4">
        <PlayLibrary />
      </div>
      <div className="flex-1 flex flex-col">
        <div className="flex-1 p-4">
          <Canvas />
        </div>
        <div className="border-t border-border p-4">
          <Controls />
        </div>
      </div>
    </div>
  );
}
