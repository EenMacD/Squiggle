import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface NavigationProps {
  showPlayList: boolean;
  onTogglePlayList: () => void;
}

export function Navigation({ showPlayList, onTogglePlayList }: NavigationProps) {
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
            </div>
          </SheetContent>
        </Sheet>
        <h1 className="text-lg font-semibold">Rugby Training Simulator</h1>
      </div>
    </nav>
  );
}
