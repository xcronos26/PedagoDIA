import { Link } from "wouter";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground">
      <div className="text-center p-8 max-w-md">
        <div className="inline-flex bg-destructive/10 p-4 rounded-full text-destructive mb-6">
          <AlertCircle className="w-12 h-12" />
        </div>
        <h1 className="text-4xl font-display font-extrabold mb-4">Página não encontrada</h1>
        <p className="text-muted-foreground text-lg mb-8">
          A página que você está procurando não existe ou foi movida.
        </p>
        <Link href="/" className="bg-primary text-primary-foreground px-8 py-4 rounded-xl font-bold shadow-lg shadow-primary/20 hover:-translate-y-1 transition-all inline-block">
          Voltar para o início
        </Link>
      </div>
    </div>
  );
}
