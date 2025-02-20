import { useQuery, useMutation } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
    <div className="h-full flex flex-col">
      <h2 className="text-xl font-bold mb-4">Play Library</h2>
      <ScrollArea className="flex-1">
        <div className="space-y-2">
          {plays?.map((play) => (
            <div key={play.id} className="flex items-center gap-2">
              <Button
                variant="ghost"
                className="flex-1 justify-start text-left"
                onClick={() => onPlaySelect(play)}
              >
                {play.name}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={() => handleDelete(play)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>

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