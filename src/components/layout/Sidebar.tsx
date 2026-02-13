import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileText,
  Leaf,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Customers", href: "/clients", icon: Users },
  { name: "Contracts", href: "/contracts", icon: FileText },
  { name: "Contract Items", href: "/contract-items", icon: FileText },
];

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <aside className={cn("fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar", className)}>
      <div className="flex h-full flex-col">
        <div className="flex h-20 items-center gap-3 px-6 border-b border-sidebar-border">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary">
            <Leaf className="h-6 w-6 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-sidebar-foreground">AgroCRM</h1>
            <p className="text-xs text-sidebar-foreground/60">Farm Management</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={onNavigate}
                className={cn(
                  "nav-link",
                  isActive && "nav-link-active"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-3">
          {user && (
            <div className="rounded-lg bg-sidebar-accent p-4 space-y-2">
              <p className="text-sm font-semibold text-sidebar-foreground">{user.name}</p>
              <p className="text-xs text-sidebar-foreground/60">{user.email}</p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full justify-center gap-2"
                onClick={logout}
              >
                <LogOut className="h-4 w-4" />
                Выйти
              </Button>
            </div>
          )}
          <div className="rounded-lg bg-sidebar-accent p-4">
            <p className="text-sm text-sidebar-foreground/80">
              Growing success together
            </p>
            <p className="text-xs text-sidebar-foreground/50 mt-1">
              Agricultural CRM v1.0
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
