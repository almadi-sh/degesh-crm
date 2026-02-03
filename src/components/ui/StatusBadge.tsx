import { cn } from "@/lib/utils";

type StatusType = 'active' | 'pending' | 'completed' | 'cancelled' | 'overdue' | 'paid' | 'draft';

interface StatusBadgeProps {
  status: StatusType | string;
  className?: string;
}

const statusStyles: Record<string, string> = {
  active: "status-active",
  pending: "status-pending",
  completed: "status-completed",
  cancelled: "status-cancelled",
  overdue: "status-overdue",
  paid: "status-paid",
  draft: "status-draft",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase();
  const styleClass = statusStyles[normalizedStatus] || "status-pending";

  return (
    <span className={cn("status-badge capitalize", styleClass, className)}>
      {status}
    </span>
  );
}
