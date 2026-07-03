import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Leaf,
  LogOut,
  Menu,
  Boxes,
  PackagePlus,
  Archive,
  BarChart3,
  ClipboardList,
  ShoppingCart,
  PhoneCall,
  Lightbulb,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useMemo, useState } from "react";

interface NavItem {
  name: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: Array<{ name: string; href: string }>;
}

const navigation: NavItem[] = [
  { name: "Главная", href: "/", icon: LayoutDashboard },
  { name: "Заявки", href: "/requests", icon: ClipboardList },
  {
    name: "Контрагенты",
    icon: Users,
    children: [
      { name: "Покупатели", href: "/client-cards" },
      { name: "Поставщики", href: "/supplier-cards" },
      { name: "Прочие", href: "/supplier-others-cards" },
      { name: "Карточка клиента", href: "/customer-card" },
    ],
  },
  {
    name: "Инвентарь",
    icon: Boxes,
    children: [
      { name: "Склады и товары", href: "/inventory" },
      { name: "Перемещения товара", href: "/incoming" },
      { name: "Аналитика", href: "/inventory-analytics" },
    ],
  },
  { name: "Брони", href: "/reservations", icon: Archive },
  { name: "Реализации", href: "/realizations", icon: ShoppingCart },
  { name: "Должники", href: "/debtors", icon: PhoneCall },
  { name: "Лиды", href: "/leads", icon: Lightbulb },
  { name: "Аналитика продаж", href: "/sales-analytics", icon: BarChart3 },
];

interface SidebarContentProps {
  onNavigate?: () => void;
}

const SIDEBAR_GROUPS_KEY = "sidebarOpenGroups";

const getStoredGroupsState = (): Record<string, boolean> => {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(SIDEBAR_GROUPS_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return parsed ?? {};
  } catch {
    return {};
  }
};

const setStoredGroupsState = (value: Record<string, boolean>) => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(SIDEBAR_GROUPS_KEY, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
};

function SidebarContent({ onNavigate }: SidebarContentProps) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const storedState = getStoredGroupsState();
    return {
      "Контрагенты": storedState["Контрагенты"] ?? true,
      "Инвентарь": storedState["Инвентарь"] ?? true,
    };
  });

  const normalizedPath = useMemo(() => location.pathname + location.search, [location.pathname, location.search]);

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-sidebar">
      <div className="flex h-20 items-center gap-3 border-b border-sidebar-border px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary">
          <Leaf className="h-6 w-6 text-sidebar-primary-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-sidebar-foreground">AgroCRM</h1>
          <p className="text-xs text-sidebar-foreground/60">Управление агробизнесом</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          if (!item.children && item.href) {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={onNavigate}
                className={cn("nav-link", isActive && "nav-link-active")}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            );
          }

          const hasActiveChild = item.children?.some((child) => normalizedPath === child.href) ?? false;
          const isOpen = openGroups[item.name] ?? false;

          return (
            <div key={item.name} className="space-y-1">
              <button
                type="button"
                onClick={() =>
                  setOpenGroups((prev) => {
                    const nextState = { ...prev, [item.name]: !isOpen };
                    setStoredGroupsState(nextState);
                    return nextState;
                  })
                }
                className={cn("nav-link w-full justify-between", hasActiveChild && "nav-link-active")}
              >
                <span className="flex items-center gap-3">
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </span>
                <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
              </button>

              {isOpen && item.children && (
                <div className="space-y-1 pl-8">
                  {item.children.map((child) => {
                    const isActive = normalizedPath === child.href;
                    return (
                      <Link
                        key={child.href}
                        to={child.href}
                        onClick={onNavigate}
                        className={cn(
                          "block rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 transition hover:bg-sidebar-accent hover:text-sidebar-foreground",
                          isActive && "bg-sidebar-accent text-sidebar-foreground",
                        )}
                      >
                        {child.name}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-sidebar-border p-4">
        {user && (
          <div className="space-y-2 rounded-lg bg-sidebar-accent p-4">
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
          <p className="text-sm text-sidebar-foreground/80">Растем и развиваемся вместе</p>
          <p className="mt-1 text-xs text-sidebar-foreground/50">Аграрная CRM v1.0</p>
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
          <Button variant="ghost" size="icon" aria-label="Открыть меню">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="h-[100dvh] w-full max-w-[320px] p-0 sm:w-[min(85vw,320px)]">
          <SheetTitle className="sr-only">Навигация</SheetTitle>
          <SidebarContent onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
