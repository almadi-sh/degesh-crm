import { FileText, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

interface Activity {
  id: string;
  type: "client" | "contract";
  description: string;
  timestamp: Date;
}

interface RecentActivityProps {
  activities: Activity[];
}

const iconMap = {
  client: Users,
  contract: FileText,
};

const colorMap = {
  client: "bg-blue-100 text-blue-600",
  contract: "bg-emerald-100 text-emerald-600",
};

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-foreground mb-4">Последняя активность</h3>
      <div className="space-y-4">
        {activities.length === 0 ? (
          <p className="text-muted-foreground text-sm">Нет недавней активности</p>
        ) : (
          activities.map((activity) => {
            const Icon = iconMap[activity.type];
            return (
              <div key={activity.id} className="flex items-start gap-3">
                <div className={`rounded-lg p-2 ${colorMap[activity.type]}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{activity.description}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDistanceToNow(activity.timestamp, { addSuffix: true, locale: ru })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
