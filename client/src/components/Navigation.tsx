import { Menu, FolderPlus, Folder, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Folder as FolderType } from "@shared/schema";

interface NavigationProps {
  selectedFolderId: number | null;
  onFolderSelect: (folderId: number | null) => void;
}

export function Navigation({ selectedFolderId, onFolderSelect }: NavigationProps) {
  const [newFolderDialog, setNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [folderToRename, setFolderToRename] = useState<FolderType | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<FolderType | null>(null);
  const [renameFolderName, setRenameFolderName] = useState("");
  const { toast } = useToast();

  const { data: folders } = useQuery<FolderType[]>({
    queryKey: ["/api/folders"],
  });

  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("POST", "/api/folders", { name });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to create playlist");
      }

      const data = await response.json();
      return data as FolderType;
    },
    onSuccess: (newFolder) => {
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      toast({
        title: "Playlist created",
        description: `Playlist "${newFolder.name}" has been created successfully.`,
      });
      setNewFolderDialog(false);
      setNewFolderName("");
    },
    onError: (error) => {
      toast({
        title: "Error creating playlist",
        description: error instanceof Error ? error.message : "Failed to create playlist",
        variant: "destructive",
      });
    },
  });

  // Delete folder mutation
  const deleteFolderMutation = useMutation({
    mutationFn: async (folderId: number) => {
      const response = await apiRequest("DELETE", `/api/folders/${folderId}`);
      if (!response.ok) throw new Error("Failed to delete playlist");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plays"] });
      toast({
        title: "Playlist deleted",
        description: "The playlist has been deleted successfully.",
      });
      setFolderToDelete(null);
      if (selectedFolderId === folderToDelete?.id) {
        onFolderSelect(null);
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete playlist",
        variant: "destructive",
      });
    },
  });

  // Rename folder mutation
  const renameFolderMutation = useMutation({
    mutationFn: async ({ folderId, name }: { folderId: number; name: string }) => {
      const response = await apiRequest("PATCH", `/api/folders/${folderId}`, { name });
      if (!response.ok) throw new Error("Failed to rename playlist");
      return response.json();
    },
    onSuccess: (updatedFolder) => {
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      toast({
        title: "Playlist renamed",
        description: `Playlist has been renamed to "${updatedFolder.name}".`,
      });
      setFolderToRename(null);
      setRenameFolderName("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to rename playlist",
        variant: "destructive",
      });
    },
  });

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a playlist name",
        variant: "destructive",
      });
      return;
    }
    createFolderMutation.mutate(newFolderName.trim());
  };

  const handleDeleteFolder = () => {
    if (folderToDelete) {
      deleteFolderMutation.mutate(folderToDelete.id);
    }
  };

  const handleRenameFolder = () => {
    if (!folderToRename || !renameFolderName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a playlist name",
        variant: "destructive",
      });
      return;
    }
    renameFolderMutation.mutate({
      folderId: folderToRename.id,
      name: renameFolderName.trim(),
    });
  };

  return (
    <nav className="border-b border-border h-12 px-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64">
            <SheetHeader>
              <SheetTitle>Playlists</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-4">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setNewFolderDialog(true)}
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                Create New Playlist
              </Button>

              <div className="space-y-1">
                {folders?.map((folder) => (
                  <div key={folder.id} className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      className={cn(
                        "flex-1 justify-start",
                        selectedFolderId === folder.id && "bg-accent"
                      )}
                      onClick={() => onFolderSelect(
                        selectedFolderId === folder.id ? null : folder.id
                      )}
                    >
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
                          onClick={() => {
                            setFolderToRename(folder);
                            setRenameFolderName(folder.name);
                          }}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Rename Playlist
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setFolderToDelete(folder)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Playlist
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <h1 className="text-lg font-semibold">Rugby Training Simulator</h1>
      </div>

      {/* Create Folder Dialog */}
      <Dialog open={newFolderDialog} onOpenChange={setNewFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Playlist</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Playlist name"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateFolder();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewFolderDialog(false);
                setNewFolderName("");
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateFolder}
              disabled={createFolderMutation.isPending}
            >
              {createFolderMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Folder Dialog */}
      <Dialog open={!!folderToRename} onOpenChange={() => setFolderToRename(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Playlist</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={renameFolderName}
              onChange={(e) => setRenameFolderName(e.target.value)}
              placeholder="New playlist name"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenameFolder();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setFolderToRename(null);
                setRenameFolderName("");
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleRenameFolder}
              disabled={renameFolderMutation.isPending}
            >
              {renameFolderMutation.isPending ? "Renaming..." : "Rename"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Folder Confirmation */}
      <AlertDialog 
        open={!!folderToDelete} 
        onOpenChange={() => setFolderToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Playlist</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{folderToDelete?.name}"? 
              Plays inside this playlist will be moved to unorganized plays.
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
    </nav>
  );
}