import { useState } from "react";
import { Canvas } from "@/components/game/Canvas";
import { PlayLibrary } from "@/components/game/PlayLibrary";
import { PlaybackView } from "@/components/game/PlaybackView";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import type { Play } from "@shared/schema";

export default function Home() {
  const [selectedPlay, setSelectedPlay] = useState<Play | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Hamburger menu for mobile */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 left-2 md:hidden z-10"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <Menu className="h-4 w-4" />
      </Button>

      {/* Sidebar */}
      <div
        className={`
          transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'w-64' : 'w-0'}
          border-r border-border overflow-hidden
        `}
      >
        <div className="w-64 h-full">
          <div className="flex items-center justify-between p-2 border-b border-border">
            <h2 className="font-semibold">Play Library</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden md:flex"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
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
  );
}