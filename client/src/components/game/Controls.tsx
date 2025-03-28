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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel
} from "@/components/ui/alert-dialog";

interface ControlsProps {
  gameEngine: GameEngine;
}

export function Controls({ gameEngine }: ControlsProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showNoPlayersWarning, setShowNoPlayersWarning] = useState(false);
  const [playName, setPlayName] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [snapshotCount, setSnapshotCount] = useState(0);
  const [isPathMode, setIsPathMode] = useState(false);
  const { toast } = useToast();

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

    setSnapshotCount(prev => prev + 1);
    toast({
      title: "Snapshot taken",
      description: `Position snapshot #${snapshotCount + 1} has been recorded`
    });
  };

  const startRecording = () => {
    const newRecordingState = gameEngine.toggleRecording();
    setIsRecording(newRecordingState);
    setSnapshotCount(0);

    if (newRecordingState) {
      toast({
        title: "Recording started",
        description: "Position players and take snapshots"
      });
    }
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

    // If we're stopping recording
    if (isRecording) {
      const newRecordingState = gameEngine.toggleRecording();
      setIsRecording(newRecordingState);

      if (snapshotCount > 0) {
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
      return;
    }

    // If we're starting recording, check for players
    if (!isRecording && gameEngine.state.players.length === 0) {
      setShowNoPlayersWarning(true);
      return;
    }

    // Start recording if we have players
    startRecording();
  };

  const { data: folders } = useQuery<Folder[]>({
    queryKey: ["/api/folders"],
  });

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
      <div className="flex flex-col gap-2 items-center">
        {isRecording && (
          <>
            <Button
              variant={isPathMode ? "outline" : "default"}
              size="lg"
              onClick={() => {
                const newPathMode = gameEngine?.togglePathMode();
                setIsPathMode(!!newPathMode);
                toast({
                  title: newPathMode ? "Path Mode Enabled" : "Path Mode Disabled",
                  description: newPathMode ? "Click and drag players to record paths" : "Normal movement mode restored"
                });
              }}
              className="w-full"
            >
              {isPathMode ? "Disable Paths" : "Enable Paths"}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => gameEngine?.incrementTouch()}
              className="w-full"
            >
              Add Touch
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={handleSnapshot}
              className="w-full"
            >
              <Camera className="h-4 w-4 mr-2" />
              Snapshot ({snapshotCount})
            </Button>
          </>
        )}

        <Button
          variant={isRecording ? "outline" : "default"}
          size="lg"
          onClick={handleRecordingToggle}
          className={`w-full ${isRecording ? "bg-white text-black hover:bg-white/90" : ""}`}
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

        {/* No Players Warning Dialog */}
        <AlertDialog
          open={showNoPlayersWarning}
          onOpenChange={setShowNoPlayersWarning}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>No Players on Field</AlertDialogTitle>
              <AlertDialogDescription>
                There must be at least one player on the field before starting recording.
                Would you like to continue anyway?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setShowNoPlayersWarning(false);
                  startRecording();
                }}
              >
                Continue Anyway
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Save Play Dialog */}
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
      </div>
    </>
  );
}