import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Contexts & Layout
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/layout";

// Pages
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Chamada from "@/pages/chamada";
import Diario from "@/pages/diario";
import Atividades from "@/pages/atividades";
import Relatorios from "@/pages/relatorios";
import RelatorioCompartilhado from "@/pages/relatorio-compartilhado";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

// Protected Route wrapper
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return null; // Handled by Layout
  if (!user) return <Redirect to="/login" />;
  
  return <Component />;
}

// Route that redirects logged-in users away from auth pages
function AuthRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return null;
  if (user) return <Redirect to="/" />;
  
  return <Component />;
}

function Router() {
  return (
    <Switch>
      {/* Public route for shared reports - outside of protected layout */}
      <Route path="/relatorio/:token">
        <RelatorioCompartilhado />
      </Route>
      
      {/* Auth routes */}
      <Route path="/login"><AuthRoute component={Login} /></Route>
      <Route path="/register"><AuthRoute component={Register} /></Route>
      
      {/* Protected routes with layout */}
      <Route path="/:rest*">
        <Layout>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/chamada" component={Chamada} />
            <Route path="/diario" component={Diario} />
            <Route path="/atividades" component={Atividades} />
            <Route path="/relatorios" component={Relatorios} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
