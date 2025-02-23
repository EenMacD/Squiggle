import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlayCircle, StopCircle, Camera } from "lucide-react";
import { useState } from "react";
import { GameEngine } from "@/lib/gameEngine";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import type { Folder } from "@shared/schema";

interface ControlsProps {
  gameEngine: GameEngine;
}

export function Controls({ gameEngine }: ControlsProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [playName, setPlayName] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const { toast } = useToast();

  const { data: folders } = useQuery<Folder[]>({
    queryKey: ["/api/folders"],
  });

  const handleSnapshot = () => {
    if (!gameEngine) {
      toast({
        title: "Error",
        description: "Game engine not initialized",
        variant: "destructive"
      });
      return;
    }

    // Trigger a snapshot manually
    const event = new KeyboardEvent('keydown', { key: ' ' });
    document.dispatchEvent(event);

    toast({
      title: "Snapshot taken",
      description: "Position snapshot has been recorded"
    });
  };

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
        description: "Position players and take snapshots"
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
        folderId: selectedFolderId ? parseInt(selectedFolderId) : null,
        keyframes
      };

      const response = await apiRequest("POST", "/api/plays", playData);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to save play");
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/plays"] });

      toast({
        title: "Play saved",
        description: `Successfully saved play: ${playName}`
      });

      setShowSaveDialog(false);
      setPlayName("");
      setSelectedFolderId("");
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

        {isRecording && (
          <Button
            variant="outline"
            size="lg"
            onClick={handleSnapshot}
          >
            <Camera className="h-4 w-4 mr-2" />
            Snapshot
          </Button>
        )}
      </div>

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Recorded Play</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="playName">Play Name</Label>
              <Input
                id="playName"
                value={playName}
                onChange={(e) => setPlayName(e.target.value)}
                placeholder="Enter a name for this play"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="folder">Save to Folder (Required)</Label>
              <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a folder" />
                </SelectTrigger>
                <SelectContent>
                  {folders?.map(folder => (
                    <SelectItem key={folder.id} value={folder.id.toString()}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowSaveDialog(false);
                setPlayName("");
                setSelectedFolderId("");
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSavePlay}
              disabled={!selectedFolderId || !playName.trim()}
            >
              Save Play
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}