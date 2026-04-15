import { useState } from "react";
import { Heart, Code2, Copy, Check, MessageCircle, GraduationCap } from "lucide-react";

const PIX_KEY = "dc242bfa-7e82-4e6a-ac75-97f3278c36e7";
const WA_URL = "https://wa.me/61984731078";

export default function Sobre() {
  const [copied, setCopied] = useState(false);

  const copyPix = async () => {
    try {
      await navigator.clipboard.writeText(PIX_KEY);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const el = document.createElement("textarea");
      el.value = PIX_KEY;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">

      {/* Logo & Identity */}
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center shadow-md shadow-primary/10">
          <GraduationCap className="w-12 h-12 text-primary" />
        </div>
        <div className="text-center">
          <h1 className="text-4xl font-display font-bold text-foreground">PedagoDIA</h1>
          <p className="text-muted-foreground text-base mt-1">Gestão de Turma para Professoras</p>
        </div>
      </div>

      {/* Desenvolvido por */}
      <div className="bg-card rounded-3xl border border-border/50 p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Code2 className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-display font-bold text-foreground">Desenvolvido por</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-primary/5 border border-primary/10">
            <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold font-display text-lg">
              L
            </div>
            <span className="font-semibold text-foreground text-lg">Lucas Nunes</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-pink-500/5 border border-pink-500/10">
            <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center font-bold font-display text-lg">
              B
            </div>
            <span className="font-semibold text-foreground text-lg">Beatriz Dantas</span>
          </div>
        </div>
      </div>

      {/* Contribuição / Doação */}
      <div className="bg-card rounded-3xl border border-border/50 p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-500 fill-red-500" />
          <h2 className="text-xl font-display font-bold text-foreground">Faça uma Contribuição</h2>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          Está gostando do PedagoDIA? Se quiser contribuir com o desenvolvimento do aplicativo,
          você pode fazer uma doação via PIX. Qualquer valor é muito bem-vindo! 😊
        </p>

        <div className="bg-muted/30 rounded-2xl border border-border/60 p-4 space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Chave PIX aleatória</p>
          <p className="font-mono text-sm text-foreground break-all select-all">{PIX_KEY}</p>
        </div>

        <button
          onClick={copyPix}
          className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-white transition-all duration-200 ${
            copied
              ? "bg-green-500 scale-[0.98]"
              : "bg-primary hover:bg-primary/90 active:scale-[0.98]"
          }`}
        >
          {copied ? (
            <>
              <Check className="w-5 h-5" />
              Chave PIX copiada!
            </>
          ) : (
            <>
              <Copy className="w-5 h-5" />
              Copiar chave PIX
            </>
          )}
        </button>

        <p className="text-center text-lg font-semibold text-foreground pt-1">
          Muito obrigado! ❤️
        </p>
      </div>

      {/* Sugestões */}
      <div className="bg-card rounded-3xl border border-border/50 p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-green-600" />
          <h2 className="text-xl font-display font-bold text-foreground">Sugestões</h2>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          Tem sugestões de melhorias ou quer pedir novas funcionalidades? Fale com a gente pelo WhatsApp!
        </p>
        <a
          href={WA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-white bg-[#25D366] hover:bg-[#1ebe57] transition-colors active:scale-[0.98]"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
          Enviar sugestões e melhorias
        </a>
      </div>

      <p className="text-center text-xs text-muted-foreground pb-4">versão 1.0</p>
    </div>
  );
}
