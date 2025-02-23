import { useState } from "react";
import { Canvas } from "@/components/game/Canvas";
import { PlayLibrary } from "@/components/game/PlayLibrary";
import { PlaybackView } from "@/components/game/PlaybackView";
import { Navigation } from "@/components/Navigation";
import type { Play } from "@shared/schema";

export default function Home() {
  const [selectedPlay, setSelectedPlay] = useState<Play | null>(null);
  const [showPlayList, setShowPlayList] = useState(false);

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <Navigation 
        showPlayList={showPlayList}
        onTogglePlayList={() => setShowPlayList(!showPlayList)}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div
          className={`
            transition-all duration-300 ease-in-out
            ${showPlayList ? 'w-64' : 'w-0'}
            border-r border-border overflow-hidden
          `}
        >
          <div className="w-64 h-full">
            <PlayLibrary onPlaySelect={setSelectedPlay} />
          </div>
        </div>

        {/* Main content */}
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
    </div>
  );
}