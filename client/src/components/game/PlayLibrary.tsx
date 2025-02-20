import { useQuery } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import type { Play } from "@shared/schema";

export function PlayLibrary() {
  const { data: plays } = useQuery<Play[]>({
    queryKey: ["/api/plays"],
  });

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-xl font-bold mb-4">Play Library</h2>
      <ScrollArea className="flex-1">
        <div className="space-y-2">
          {plays?.map((play) => (
            <Button
              key={play.id}
              variant="ghost"
              className="w-full justify-start text-left"
            >
              {play.name}
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
