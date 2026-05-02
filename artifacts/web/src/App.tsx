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
import Planejamento from "@/pages/planejamento";
import RelatorioCompartilhado from "@/pages/relatorio-compartilhado";
import Sobre from "@/pages/sobre";
import BemVinda from "@/pages/bem-vinda";
import Perfil from "@/pages/perfil";
import Turmas from "@/pages/turmas";
import Provas from "@/pages/provas";
import Admin from "@/pages/admin";
import Escola from "@/pages/escola";
import RelatorioBimestral from "@/pages/relatorio-bimestral";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

// Protected Route wrapper
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user) return <Redirect to="/login" />;

  return <Component />;
}

// Role-protected Route wrapper
function RoleRoute({ component: Component, roles }: { component: React.ComponentType; roles: string[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user) return <Redirect to="/login" />;
  if (!user.role || !roles.includes(user.role)) return <Redirect to="/" />;

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

      {/* Onboarding - protected but without app layout */}
      <Route path="/bem-vinda"><ProtectedRoute component={BemVinda} /></Route>

      {/* Protected routes with layout */}
      <Route>
        <Layout>
          <Switch>
            <Route path="/"><ProtectedRoute component={Dashboard} /></Route>
            <Route path="/perfil"><ProtectedRoute component={Perfil} /></Route>
            <Route path="/turmas"><ProtectedRoute component={Turmas} /></Route>
            <Route path="/chamada"><ProtectedRoute component={Chamada} /></Route>
            <Route path="/diario"><ProtectedRoute component={Diario} /></Route>
            <Route path="/atividades"><ProtectedRoute component={Atividades} /></Route>
            <Route path="/relatorios"><ProtectedRoute component={Relatorios} /></Route>
            <Route path="/planejamento"><ProtectedRoute component={Planejamento} /></Route>
            <Route path="/provas"><ProtectedRoute component={Provas} /></Route>
            <Route path="/relatorio-bimestral"><ProtectedRoute component={RelatorioBimestral} /></Route>
            <Route path="/sobre"><ProtectedRoute component={Sobre} /></Route>
            <Route path="/admin"><RoleRoute component={Admin} roles={["super_admin"]} /></Route>
            <Route path="/escola"><RoleRoute component={Escola} roles={["admin_institucional", "super_admin"]} /></Route>
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
