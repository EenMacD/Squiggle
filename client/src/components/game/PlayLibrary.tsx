import { useQuery, useMutation } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Trash2, 
  Folder,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  FolderInput
} from "lucide-react";
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
  onPlaySelect: (play: Play) => void;
}

export function PlayLibrary({ onPlaySelect }: PlayLibraryProps) {
  const { data: folders, isLoading: foldersLoading } = useQuery<FolderType[]>({
    queryKey: ["/api/folders"],
  });

  const { data: plays, isLoading: playsLoading } = useQuery<Play[]>({
    queryKey: ["/api/plays"],
  });

  const { toast } = useToast();
  const [playToDelete, setPlayToDelete] = useState<Play | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<FolderType | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());

  // Delete folder mutation
  const deleteFolderMutation = useMutation({
    mutationFn: async (folderId: number) => {
      const response = await apiRequest("DELETE", `/api/folders/${folderId}`);
      if (!response.ok) throw new Error("Failed to delete folder");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plays"] });
      toast({
        title: "Folder deleted",
        description: "The folder has been deleted successfully.",
      });
      setFolderToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete folder",
        variant: "destructive",
      });
    },
  });

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
    mutationFn: async ({ playId, folderId }: { playId: number; folderId: number | null }) => {
      const response = await apiRequest("PATCH", `/api/plays/${playId}/folder`, { folderId });
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

  const toggleFolder = (folderId: number) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleDeleteFolder = () => {
    if (folderToDelete) {
      deleteFolderMutation.mutate(folderToDelete.id);
    }
  };

  const handleDeletePlay = () => {
    if (playToDelete) {
      deletePlayMutation.mutate(playToDelete.id);
    }
  };

  const handleMovePlay = (play: Play, folderId: number | null) => {
    movePlayMutation.mutate({ playId: play.id, folderId });
  };

  if (!folders || !plays) return null;

  const unorganizedPlays = plays.filter(play => !play.folderId);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-2 border-b border-border">
        <h2 className="font-semibold">Play List</h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4 p-2">
          {/* Folders section first */}
          {folders.map((folder) => (
            <div key={folder.id} className="space-y-1">
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => toggleFolder(folder.id)}
                >
                  {expandedFolders.has(folder.id) ? (
                    <ChevronDown className="h-4 w-4 mr-2" />
                  ) : (
                    <ChevronRight className="h-4 w-4 mr-2" />
                  )}
                  <Folder className="h-4 w-4 mr-2" />
                  {folder.name}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={() => setFolderToDelete(folder)}
                    >
                      Delete Folder
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Plays in folder */}
              {expandedFolders.has(folder.id) && (
                <div className="ml-6 space-y-1">
                  {plays
                    .filter(play => play.folderId === folder.id)
                    .map(play => (
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
                            <DropdownMenuItem onClick={() => handleMovePlay(play, null)}>
                              Remove from Folder
                            </DropdownMenuItem>
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
              )}
            </div>
          ))}

          {/* Unorganized plays */}
          <div>
            <h3 className="text-sm font-medium mb-2">Plays</h3>
            <div className="space-y-1">
              {unorganizedPlays.map(play => (
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
                      {folders.length > 0 && folders.map(folder => (
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
          </div>
        </div>
      </ScrollArea>

      {/* Delete Folder Confirmation */}
      <AlertDialog 
        open={!!folderToDelete} 
        onOpenChange={() => setFolderToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Folder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{folderToDelete?.name}"? 
              Plays inside this folder will be moved to unorganized plays.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteFolder}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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