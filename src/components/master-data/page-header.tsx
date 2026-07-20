import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ReactNode } from "react";

interface Props {
  title: string;
  description?: string;
  onAdd?: () => void;
  addLabel?: string;
  canWrite?: boolean;
  extra?: ReactNode;
}

export function MasterPageHeader({
  title,
  description,
  onAdd,
  addLabel = "Tambah",
  canWrite = true,
  extra,
}: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {extra}
        {canWrite && onAdd && (
          <Button onClick={onAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            {addLabel}
          </Button>
        )}
      </div>
    </div>
  );
}