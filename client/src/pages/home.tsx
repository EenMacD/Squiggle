import { useState } from "react";
import { Canvas } from "@/components/game/Canvas";
import { PlayLibrary } from "@/components/game/PlayLibrary";
import { PlaybackView } from "@/components/game/PlaybackView";
import type { Play } from "@shared/schema";

export default function Home() {
  const [selectedPlay, setSelectedPlay] = useState<Play | null>(null);

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <div className="w-64 border-r border-border p-2">
        <PlayLibrary onPlaySelect={setSelectedPlay} />
      </div>
      <div className="flex-1 flex flex-col p-2">
        {selectedPlay ? (
          <PlaybackView 
            play={selectedPlay} 
            onClose={() => setSelectedPlay(null)} 
          />
        ) : (
          <Canvas />
        )}
      </div>
    </div>
  );
}