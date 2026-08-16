import * as React from "react";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

interface InfoTooltipProps {
  content: string;
}

export function InfoTooltip({ content }: InfoTooltipProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className="inline-flex ml-1 text-muted-foreground hover:text-foreground">
            <Info className="h-3.5 w-3.5" />
            <span className="sr-only">Informasi</span>
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-[280px]">
          <p className="text-[11px] leading-normal">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
