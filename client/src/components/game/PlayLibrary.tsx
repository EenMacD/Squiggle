import { useQuery, useMutation } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { X, MoreVertical, FolderInput } from "lucide-react";
import type { Play, Folder as FolderType } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";

interface PlayLibraryProps {
  folderId: number;
  onPlaySelect: (play: Play) => void;
  onClose: () => void;
}

export function PlayLibrary({ folderId, onPlaySelect, onClose }: PlayLibraryProps) {
  const { data: plays = [] } = useQuery<Play[]>({
    queryKey: ["/api/plays"],
  });

  const { data: folders } = useQuery<FolderType[]>({
    queryKey: ["/api/folders"],
  });

  const { toast } = useToast();
  const [playToDelete, setPlayToDelete] = useState<Play | null>(null);

  // Delete play mutation
  const deletePlayMutation = useMutation({
    mutationFn: async (playId: number) => {
      const response = await apiRequest("DELETE", `/api/plays/${playId}`);
      if (!response.ok) throw new Error("Failed to delete play");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plays"] });
      toast({
        title: "Play deleted",
        description: "The play has been successfully deleted.",
      });
      setPlayToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete play",
        variant: "destructive",
      });
    },
  });

  // Move play mutation
  const movePlayMutation = useMutation({
    mutationFn: async ({ playId, newFolderId }: { playId: number; newFolderId: number | null }) => {
      const response = await apiRequest("PATCH", `/api/plays/${playId}/folder`, { folderId: newFolderId });
      if (!response.ok) throw new Error("Failed to move play");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/plays"] });
      toast({
        title: "Play moved",
        description: "The play has been moved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to move play",
        variant: "destructive",
      });
    },
  });

  const handleDeletePlay = () => {
    if (playToDelete) {
      deletePlayMutation.mutate(playToDelete.id);
    }
  };

  const handleMovePlay = (play: Play, newFolderId: number | null) => {
    movePlayMutation.mutate({ playId: play.id, newFolderId });
  };

  // Filter plays for current folder
  const folderPlays = plays.filter(play => play.folderId === folderId);
  const currentFolder = folders?.find(f => f.id === folderId);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex-1 text-center font-semibold">
          {currentFolder?.name || "Plays"}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="absolute right-2">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {folderPlays.map(play => (
            <div key={play.id} className="flex items-center gap-1">
              <Button
                variant="ghost"
                className="flex-1 justify-start text-left h-8 px-2"
                onClick={() => onPlaySelect(play)}
              >
                {play.name}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {folders?.filter(f => f.id !== folderId).map(folder => (
                    <DropdownMenuItem
                      key={folder.id}
                      onClick={() => handleMovePlay(play, folder.id)}
                    >
                      <FolderInput className="h-4 w-4 mr-2" />
                      Move to {folder.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => setPlayToDelete(play)}
                  >
                    Delete Play
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Delete Play Confirmation */}
      <AlertDialog
        open={!!playToDelete}
        onOpenChange={() => setPlayToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Play</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{playToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeletePlay}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}