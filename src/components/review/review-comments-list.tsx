import { User } from "lucide-react";

export interface ReviewCommentData {
  id: string;
  section_id: string | null;
  section_type: string | null;
  reviewer_name: string | null;
  comment_text: string;
  created_at: string;
}

interface ReviewCommentsListProps {
  comments: ReviewCommentData[];
}

export function ReviewCommentsList({ comments }: ReviewCommentsListProps) {
  if (comments.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      {comments.map((comment) => (
        <div
          key={comment.id}
          className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3"
        >
          <div className="flex items-center gap-2 text-sm">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
              <User className="h-3.5 w-3.5 text-zinc-500" />
            </div>
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {comment.reviewer_name || "Anonymous"}
            </span>
            <span className="text-zinc-400 text-xs">
              {formatRelativeTime(comment.created_at)}
            </span>
          </div>
          <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
            {comment.comment_text}
          </p>
        </div>
      ))}
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
