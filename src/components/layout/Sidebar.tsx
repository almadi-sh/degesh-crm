import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileText,
  Leaf,
  LogOut,
  Menu,
  Boxes,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Customers", href: "/clients", icon: Users },
  { name: "Contracts", href: "/contracts", icon: FileText },
  { name: "Contract Items", href: "/contract-items", icon: FileText },
  { name: "Inventory", href: "/inventory", icon: Boxes },
];

interface SidebarContentProps {
  onNavigate?: () => void;
}

function SidebarContent({ onNavigate }: SidebarContentProps) {
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-sidebar">
        {/* Logo */}
        <div className="flex h-20 items-center gap-3 px-6 border-b border-sidebar-border">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary">
            <Leaf className="h-6 w-6 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-sidebar-foreground">AgroCRM</h1>
            <p className="text-xs text-sidebar-foreground/60">Farm Management</p>
          </div>
        </div>

        {/* Navigation */}
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

        {/* Footer */}
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
                onClick={() => {
                  logout();
                  onNavigate?.();
                }}
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
  );
}

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 lg:block">
      <SidebarContent />
    </aside>
  );
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <div className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur lg:hidden">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary">
          <Leaf className="h-4 w-4 text-sidebar-primary-foreground" />
        </div>
        <span className="font-semibold">AgroCRM</span>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="h-[100dvh] w-full max-w-[320px] p-0 sm:w-[min(85vw,320px)]">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
