import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, ShoppingCart, Package, Boxes, Tags, Users, CreditCard,
  Factory, Building2, Undo2, Wallet, BarChart3, Receipt, Barcode, Settings,
  LogOut, PanelLeftClose,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import logoSrc from "@/asset/image/logo.png";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pos", label: "POS / Sales", icon: ShoppingCart },
  { href: "/products", label: "Products", icon: Package },
  { href: "/barcodes", label: "Barcodes", icon: Barcode },
  { href: "/stock", label: "Stock", icon: Boxes },
  { href: "/distributors", label: "Distributors", icon: Factory },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/invoices", label: "Invoices", icon: Receipt },
  { href: "/arrears", label: "Arrears", icon: CreditCard },
  { href: "/returns", label: "Returns", icon: Undo2 },
  { href: "/expenses", label: "Expenses", icon: Wallet },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const pathname = location.pathname;
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "h-full bg-sidebar-background flex flex-col shrink-0 transition-all duration-300 ease-out relative select-none",
        collapsed ? "w-[60px]" : "w-[220px]"
      )}
    >
      <div className={cn(
        "flex items-center h-12 relative",
        collapsed ? "justify-center" : "px-3 gap-2.5"
      )}>
        <div className="flex items-center justify-center rounded-lg h-7 w-7 bg-sidebar-primary/10 shrink-0 overflow-hidden">
          <img src={logoSrc} alt="Faraz Pharmacy" className="h-5 w-5 object-contain" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="min-w-0 overflow-hidden"
            >
              <p className="text-xs font-display font-semibold text-sidebar-foreground truncate tracking-tight">Faraz Pharmacy</p>
              <p className="text-[8px] text-sidebar-foreground/40 truncate tracking-widest uppercase">Management</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className={cn("px-2 pb-2.5", collapsed && "px-1")}>
        <button
          onClick={() => navigate("/pos")}
          className={cn(
            "flex items-center w-full rounded-md transition-all duration-150 text-xs font-medium",
            "bg-accent text-accent-foreground hover:bg-accent-hover shadow-xs",
            collapsed ? "justify-center h-7" : "gap-2 px-2.5 h-7"
          )}
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                New Sale
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto space-y-0.5 px-2" data-sidebar>
        {navItems.map((item, idx) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: idx * 0.015, duration: 0.2 }}
            >
              <button
                onClick={() => navigate(item.href)}
                className={cn(
                  "group relative flex items-center w-full rounded-md transition-all duration-150",
                  collapsed ? "justify-center h-7" : "gap-2.5 px-2.5 pl-3 h-7",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                {isActive && !collapsed && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full bg-sidebar-primary" />
                )}
                <Icon className={cn(
                  "shrink-0 relative",
                  collapsed ? "h-3.5 w-3.5" : "h-3.5 w-3.5",
                  isActive ? "text-sidebar-primary" : ""
                )} />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-[11px] font-medium relative truncate"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </motion.div>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border px-2 pt-2 pb-3 space-y-1">
        <div className={cn(
          "flex items-center rounded-md px-2 py-1.5 hover:bg-sidebar-accent/50 transition-colors cursor-pointer",
          collapsed && "justify-center px-0"
        )}>
          <div className="h-6 w-6 rounded-md bg-sidebar-primary/10 flex items-center justify-center shrink-0">
            <span className="text-[9px] font-bold text-sidebar-primary">
              {user?.username?.slice(0, 2).toUpperCase() || "AD"}
            </span>
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="min-w-0 overflow-hidden flex-1 ml-2"
              >
                <p className="text-[11px] font-medium text-sidebar-foreground/80 truncate leading-tight">{user?.username || "Admin"}</p>
                <p className="text-[8px] text-sidebar-foreground/40 truncate tracking-wider uppercase leading-tight">Admin</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button
          onClick={logout}
          className={cn(
            "flex items-center rounded-md transition-all duration-150 text-sidebar-foreground/40 hover:text-danger",
            collapsed ? "justify-center h-7" : "gap-2.5 px-2.5 h-7 w-full text-[11px]"
          )}
        >
          <LogOut className="h-3 w-3 shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                Sign out
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className={cn(
          "absolute -right-3 top-12 h-5 w-5 rounded-full border border-border bg-surface flex items-center justify-center text-text-secondary hover:text-text-primary transition-all duration-200 z-20 shadow-xs",
          "hover:scale-105 active:scale-95",
          collapsed && "rotate-180"
        )}
      >
        <PanelLeftClose className="h-2.5 w-2.5" />
      </button>
    </aside>
  );
}
