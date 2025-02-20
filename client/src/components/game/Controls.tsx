import { Button } from "@/components/ui/button";
import { PlayCircle, StopCircle, Save } from "lucide-react";

export function Controls() {
  return (
    <div className="flex gap-4 items-center">
      <Button variant="outline" size="sm">
        <PlayCircle className="h-4 w-4 mr-2" />
        Start Recording
      </Button>
      <Button variant="outline" size="sm">
        <StopCircle className="h-4 w-4 mr-2" />
        Stop Recording
      </Button>
      <Button variant="outline" size="sm">
        <Save className="h-4 w-4 mr-2" />
        Save Play
      </Button>
    </div>
  );
}
