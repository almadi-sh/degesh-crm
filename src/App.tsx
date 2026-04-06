import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Requests from "./pages/Requests";
import Clients from "./pages/Clients";
import Contracts from "./pages/Contracts";
import ContractItems from "./pages/ContractItems";
import Inventory from "./pages/Inventory";
import Incoming from "./pages/Incoming";
import Reservations from "./pages/Reservations";
import ClientCards from "./pages/ClientCards";
import Suppliers from "./pages/Suppliers";
import SupplierCards from "./pages/SupplierCards";
import SalesAnalytics from "./pages/SalesAnalytics";
import InventoryAnalytics from "./pages/InventoryAnalytics";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import { AuthProvider } from "./hooks/useAuth";
import ProtectedRoute from "./components/auth/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/requests" element={<Requests />} />
              <Route path="/requests/:requestId" element={<Requests />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/contracts" element={<Contracts />} />
              <Route path="/contract-items" element={<ContractItems />} />
              <Route path="/incoming" element={<Incoming />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/reservations" element={<Reservations />} />
              <Route path="/client-cards" element={<ClientCards />} />
              <Route path="/suppliers" element={<Suppliers />} />
              <Route path="/supplier-cards" element={<SupplierCards />} />
              <Route path="/sales-analytics" element={<SalesAnalytics />} />
              <Route path="/inventory-analytics" element={<InventoryAnalytics />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
