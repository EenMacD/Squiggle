import { Menu, FolderPlus, Folder } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { Folder as FolderType } from "@shared/schema";

interface NavigationProps {
  showPlayList: boolean;
  onTogglePlayList: () => void;
}

export function Navigation({ showPlayList, onTogglePlayList }: NavigationProps) {
  const [newFolderDialog, setNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const { toast } = useToast();

  const { data: folders } = useQuery<FolderType[]>({
    queryKey: ["/api/folders"],
  });

  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("POST", "/api/folders", { name });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to create folder");
      }

      const data = await response.json();
      return data as FolderType;
    },
    onSuccess: (newFolder) => {
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      toast({
        title: "Folder created",
        description: `Folder "${newFolder.name}" has been created successfully.`,
      });
      setNewFolderDialog(false);
      setNewFolderName("");
    },
    onError: (error) => {
      toast({
        title: "Error creating folder",
        description: error instanceof Error ? error.message : "Failed to create folder",
        variant: "destructive",
      });
    },
  });

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a folder name",
        variant: "destructive",
      });
      return;
    }
    createFolderMutation.mutate(newFolderName.trim());
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
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-1">
              {/* Play List Directory Option */}
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start",
                    showPlayList && "bg-accent"
                  )}
                  onClick={onTogglePlayList}
                >
                  Play List
                </Button>
                {/* Add Folder Option */}
                {showPlayList && (
                  <>
                    <Button
                      variant="ghost"
                      className="w-full justify-start pl-8 text-sm"
                      onClick={() => setNewFolderDialog(true)}
                    >
                      <FolderPlus className="h-4 w-4 mr-2" />
                      Add Folder
                    </Button>
                    {/* Show folders */}
                    {folders?.map((folder) => (
                      <Button
                        key={folder.id}
                        variant="ghost"
                        className="w-full justify-start pl-8 text-sm"
                      >
                        <Folder className="h-4 w-4 mr-2" />
                        {folder.name}
                      </Button>
                    ))}
                  </>
                )}
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
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
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
    </nav>
  );
}