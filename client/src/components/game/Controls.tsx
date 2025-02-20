import { Button } from "@/components/ui/button";
import { PlayCircle, StopCircle, Save } from "lucide-react";
import { useRef } from "react";
import { GameEngine } from "@/lib/gameEngine";

interface ControlsProps {
  gameEngine: GameEngine | null;
}

export function Controls({ gameEngine }: ControlsProps) {
  const isRecordingRef = useRef(false);

  const handleRecordingToggle = () => {
    if (gameEngine) {
      isRecordingRef.current = !isRecordingRef.current;
      gameEngine.toggleRecording();
    }
  };

  return (
    <div className="flex gap-4 items-center">
      <Button 
        variant="outline" 
        size="sm"
        onClick={handleRecordingToggle}
      >
        {isRecordingRef.current ? (
          <>
            <StopCircle className="h-4 w-4 mr-2" />
            Stop Recording
          </>
        ) : (
          <>
            <PlayCircle className="h-4 w-4 mr-2" />
            Start Recording
          </>
        )}
      </Button>
      <Button variant="outline" size="sm">
        <Save className="h-4 w-4 mr-2" />
        Save Play
      </Button>
    </div>
  );
}