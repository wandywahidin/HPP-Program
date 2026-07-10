import { CircleAlert } from "lucide-react";

export function ErrorBanner({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
      <CircleAlert className="h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}
