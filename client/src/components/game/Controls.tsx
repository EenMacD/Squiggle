import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlayCircle, StopCircle } from "lucide-react";
import { useState } from "react";
import { GameEngine } from "@/lib/gameEngine";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

interface ControlsProps {
  gameEngine: GameEngine;
}

export function Controls({ gameEngine }: ControlsProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [playName, setPlayName] = useState("");
  const { toast } = useToast();

  const handleRecordingToggle = () => {
    if (!gameEngine) {
      toast({
        title: "Error",
        description: "Game engine not initialized",
        variant: "destructive"
      });
      return;
    }

    const newRecordingState = gameEngine.toggleRecording();
    setIsRecording(newRecordingState);

    if (newRecordingState) {
      toast({
        title: "Recording started",
        description: "Position players and press SPACE to take snapshots"
      });
    } else {
      if (gameEngine.getRecordedKeyFrames().length > 0) {
        setShowSaveDialog(true);
      } else {
        toast({
          title: "No snapshots taken",
          description: "Take at least one snapshot before stopping the recording",
          variant: "destructive"
        });
        setIsRecording(true);
        gameEngine.toggleRecording(); // Resume recording
      }
    }
  };

  const handleSavePlay = async () => {
    if (!gameEngine || !playName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for the play",
        variant: "destructive"
      });
      return;
    }

    try {
      const keyframes = gameEngine.getRecordedKeyFrames();

      if (keyframes.length === 0) {
        toast({
          title: "Error",
          description: "No snapshots recorded. Press SPACE to take at least one snapshot.",
          variant: "destructive"
        });
        return;
      }

      const playData = {
        name: playName,
        category: "default",
        keyframes
      };

      const response = await apiRequest("POST", "/api/plays", playData);
      const result = await response.json();

      await queryClient.invalidateQueries({ queryKey: ["/api/plays"] });

      toast({
        title: "Play saved",
        description: `Successfully saved play: ${playName}`
      });

      setShowSaveDialog(false);
      setPlayName("");
      setIsRecording(false);
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Error saving play",
        description: error instanceof Error ? error.message : "Failed to save the play. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDefaultPositions = () => {
    if (!gameEngine) return;
    gameEngine.setDefaultPositions();
    toast({
      title: "Default Positions",
      description: "Players have been arranged in their default positions"
    });
  };

  return (
    <>
      <div className="flex gap-4 items-center bg-background rounded-lg p-2 shadow-lg">
        <Button 
          variant={isRecording ? "destructive" : "default"}
          size="lg"
          onClick={handleRecordingToggle}
        >
          {isRecording ? (
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
        {gameEngine.state.players.length > 0 && (
          <Button
            variant="outline"
            onClick={handleDefaultPositions}
          >
            Default Positions
          </Button>
        )}
      </div>

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Recorded Play</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="playName">Play Name</Label>
            <Input
              id="playName"
              value={playName}
              onChange={(e) => setPlayName(e.target.value)}
              placeholder="Enter a name for this play"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSaveDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSavePlay}>Save Play</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}