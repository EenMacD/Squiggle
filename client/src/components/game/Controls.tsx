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
  gameEngine: GameEngine | null;
}

export function Controls({ gameEngine }: ControlsProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [playName, setPlayName] = useState("");
  const { toast } = useToast();

  const handleRecordingToggle = () => {
    if (!gameEngine) return;

    gameEngine.toggleRecording();

    if (isRecording) {
      // Stopping recording
      setShowSaveDialog(true);
    }

    setIsRecording(!isRecording);
  };

  const handleSavePlay = async () => {
    if (!gameEngine || !playName.trim()) return;

    try {
      const movements = gameEngine.getRecordedMovements();
      await apiRequest("POST", "/api/plays", {
        name: playName,
        category: "default",
        movements
      });

      // Invalidate the plays query to refetch the list
      await queryClient.invalidateQueries({ queryKey: ["/api/plays"] });

      toast({
        title: "Play saved",
        description: `Successfully saved play: ${playName}`
      });

      setShowSaveDialog(false);
      setPlayName("");
      setIsRecording(false);
    } catch (error) {
      toast({
        title: "Error saving play",
        description: "Failed to save the play. Please try again.",
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