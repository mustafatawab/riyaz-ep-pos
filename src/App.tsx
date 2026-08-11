import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ServerConnectionProvider } from "@/contexts/ServerConnectionContext";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import OfflineBanner from "@/components/shared/OfflineBanner";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import POS from "@/pages/POS";
import Products from "@/pages/Products";
import Customers from "@/pages/Customers";
import CustomerDetail from "@/pages/CustomerDetail";
import Arrears from "@/pages/Arrears";
import Stock from "@/pages/Stock";
import Distributors from "@/pages/Distributors";
import Companies from "@/pages/Companies";
import Returns from "@/pages/Returns";
import Categories from "@/pages/Categories";
import Barcodes from "@/pages/Barcodes";
import Expenses from "@/pages/Expenses";
import Reports from "@/pages/Reports";
import Invoices from "@/pages/Invoices";
import Settings from "@/pages/Settings";

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15, ease: "easeIn" } },
} as const;

function AnimatedPage({ children }: { children: React.ReactNode }) {
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
      {children}
    </motion.div>
  );
}

function AppShell() {
  const { isAuthenticated } = useAuth();
  const [ready, setReady] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) return null;

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <OfflineBanner />
        <main className="flex-1 overflow-y-auto p-5 lg:p-6">
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Navigate to="/pos" replace />} />
              <Route path="/dashboard" element={<AnimatedPage><Dashboard /></AnimatedPage>} />
              <Route path="/pos" element={<AnimatedPage><POS /></AnimatedPage>} />
              <Route path="/products" element={<AnimatedPage><Products /></AnimatedPage>} />
              <Route path="/customers" element={<AnimatedPage><Customers /></AnimatedPage>} />
              <Route path="/customers/:id" element={<AnimatedPage><CustomerDetail /></AnimatedPage>} />
              <Route path="/arrears" element={<AnimatedPage><Arrears /></AnimatedPage>} />
              <Route path="/stock" element={<AnimatedPage><Stock /></AnimatedPage>} />
              <Route path="/distributors" element={<AnimatedPage><Distributors /></AnimatedPage>} />
              <Route path="/companies" element={<AnimatedPage><Companies /></AnimatedPage>} />
              <Route path="/barcodes" element={<AnimatedPage><Barcodes /></AnimatedPage>} />
              <Route path="/returns" element={<AnimatedPage><Returns /></AnimatedPage>} />
              <Route path="/expenses" element={<AnimatedPage><Expenses /></AnimatedPage>} />
              <Route path="/reports" element={<AnimatedPage><Reports /></AnimatedPage>} />
              <Route path="/invoices" element={<AnimatedPage><Invoices /></AnimatedPage>} />
              <Route path="/settings" element={<AnimatedPage><Settings /></AnimatedPage>} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ServerConnectionProvider>
      <AuthProvider>
        <AppShell />
        <Toaster richColors position="top-right" closeButton />
      </AuthProvider>
    </ServerConnectionProvider>
  );
}
