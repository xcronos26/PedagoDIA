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
import Chamada from "@/pages/chamada";
import Diario from "@/pages/diario";
import Atividades from "@/pages/atividades";
import Relatorios from "@/pages/relatorios";
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
  if (user) return <Redirect to="/chamada" />;
  
  return <Component />;
}

function Router() {
  return (
    <Layout>
      <Switch>
        {/* Auth routes */}
        <Route path="/login"><AuthRoute component={Login} /></Route>
        <Route path="/register"><AuthRoute component={Register} /></Route>
        
        {/* Protected routes */}
        <Route path="/"><Redirect to="/chamada" /></Route>
        <Route path="/chamada"><ProtectedRoute component={Chamada} /></Route>
        <Route path="/diario"><ProtectedRoute component={Diario} /></Route>
        <Route path="/atividades"><ProtectedRoute component={Atividades} /></Route>
        <Route path="/relatorios"><ProtectedRoute component={Relatorios} /></Route>
        
        <Route component={NotFound} />
      </Switch>
    </Layout>
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
