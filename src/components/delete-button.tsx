"use client";

import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function DeleteButton({
  action,
  confirmMessage,
}: {
  action: () => Promise<void>;
  confirmMessage: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmMessage)) e.preventDefault();
      }}
    >
      <Button type="submit" variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700">
        <Trash2 className="h-4 w-4" />
        <span className="sr-only">Hapus</span>
      </Button>
    </form>
  );
}
