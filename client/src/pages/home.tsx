import { useState } from "react";
import { Canvas } from "@/components/game/Canvas";
import { PlayLibrary } from "@/components/game/PlayLibrary";
import { PlaybackView } from "@/components/game/PlaybackView";
import { Navigation } from "@/components/Navigation";
import type { Play } from "@shared/schema";

export default function Home() {
  const [selectedPlay, setSelectedPlay] = useState<Play | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <Navigation 
        selectedFolderId={selectedFolderId}
        onFolderSelect={setSelectedFolderId}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - only shown when a folder is selected */}
        {selectedFolderId !== null && (
          <div className="w-64 border-r border-border">
            <PlayLibrary 
              folderId={selectedFolderId} 
              onPlaySelect={setSelectedPlay}
              onClose={() => setSelectedFolderId(null)}
            />
          </div>
        )}

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