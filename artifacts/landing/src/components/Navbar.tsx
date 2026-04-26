import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2" data-testid="link-home-logo">
          <img src="/logo.png" alt="PedagoDIA" className="w-9 h-9 rounded-xl" />
          <span className="font-bold text-xl tracking-tight text-foreground">PedagoDIA</span>
        </Link>
        <div className="flex items-center gap-4">
          <a href="/web/" data-testid="link-acessar-plataforma-nav">
            <Button variant="secondary" className="font-bold text-secondary-foreground shadow-sm">
              Acessar plataforma
            </Button>
          </a>
        </div>
      </div>
    </nav>
  );
}
