import { Menu, FolderPlus } from "lucide-react";
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

interface NavigationProps {
  showPlayList: boolean;
  onTogglePlayList: () => void;
}

export function Navigation({ showPlayList, onTogglePlayList }: NavigationProps) {
  const [newFolderDialog, setNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const { toast } = useToast();

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const response = await apiRequest("POST", "/api/folders", { name: newFolderName.trim() });
      if (!response.ok) throw new Error("Failed to create folder");

      await queryClient.invalidateQueries({ queryKey: ["/api/folders"] });

      toast({
        title: "Folder created",
        description: "New folder has been created successfully.",
      });

      setNewFolderDialog(false);
      setNewFolderName("");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create folder",
        variant: "destructive",
      });
    }
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
              {showPlayList && (
                <Button
                  variant="ghost"
                  className="w-full justify-start pl-8 text-sm"
                  onClick={() => setNewFolderDialog(true)}
                >
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Add Folder
                </Button>
              )}
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
            <Button onClick={handleCreateFolder}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </nav>
  );
}