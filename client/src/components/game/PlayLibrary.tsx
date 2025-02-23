import { useQuery, useMutation } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Trash2, ChevronRight } from "lucide-react";
import type { Play } from "@shared/schema";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";

interface PlayLibraryProps {
  onPlaySelect: (play: Play) => void;
}

export function PlayLibrary({ onPlaySelect }: PlayLibraryProps) {
  const { data: plays } = useQuery<Play[]>({
    queryKey: ["/api/plays"],
  });
  const { toast } = useToast();
  const [playToDelete, setPlayToDelete] = useState<Play | null>(null);
  const [isOpen, setIsOpen] = useState(true);

  const deleteMutation = useMutation({
    mutationFn: async (playId: number) => {
      const response = await apiRequest("DELETE", `/api/plays/${playId}`);
      if (!response.ok) {
        throw new Error("Failed to delete play");
      }
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

  const handleDelete = (play: Play) => {
    setPlayToDelete(play);
  };

  const confirmDelete = () => {
    if (playToDelete) {
      deleteMutation.mutate(playToDelete.id);
    }
  };

  return (
    <div className="h-full flex flex-col gap-2">
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className="w-full space-y-2"
      >
        <div className="flex items-center justify-between px-2">
          <h2 className="text-lg font-semibold">Play Library</h2>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-8 p-0">
              <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
              <span className="sr-only">Toggle play library</span>
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          <ScrollArea className="flex-1 h-[calc(100vh-8rem)]">
            <div className="space-y-1 pr-2">
              {plays?.map((play) => (
                <div key={play.id} className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    className="flex-1 justify-start text-left h-8 px-2"
                    onClick={() => onPlaySelect(play)}
                  >
                    {play.name}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(play)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CollapsibleContent>
      </Collapsible>

      <AlertDialog open={!!playToDelete} onOpenChange={() => setPlayToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Play</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{playToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}