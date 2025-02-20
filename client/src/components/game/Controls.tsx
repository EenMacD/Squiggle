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

    if (!newRecordingState) { // If we just stopped recording
      setShowSaveDialog(true);
    } else {
      toast({
        title: "Recording started",
        description: "Move players and pass the ball to record the sequence"
      });
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
      console.log('Saving keyframes:', keyframes);

      if (keyframes.length === 0) {
        toast({
          title: "Error",
          description: "No movements recorded. Try moving players and passing the ball first.",
          variant: "destructive"
        });
        return;
      }

      const playData = {
        name: playName,
        category: "default",
        keyframes
      };

      console.log('Sending play data:', playData);

      const response = await apiRequest("POST", "/api/plays", playData);
      const result = await response.json();
      console.log('Save response:', result);

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

  return (
    <>
      <div className="flex gap-4 items-center">
        <Button 
          variant={isRecording ? "destructive" : "outline"}
          size="sm"
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