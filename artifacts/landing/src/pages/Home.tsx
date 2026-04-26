import { Link } from "wouter";
import { Navbar } from "@/components/Navbar";
import { PhoneFrame } from "@/components/PhoneFrame";
import { LaptopFrame } from "@/components/LaptopFrame";
import { Button } from "@/components/ui/button";
import { motion, type Variants } from "framer-motion";
import {
  Clock,
  BookOpen,
  FileText,
  Smartphone,
  Monitor,
  Star,
  Zap,
  Users,
  Package,
} from "lucide-react";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.25, 0.1, 0.25, 1] } },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-background font-sans overflow-x-hidden">
      <Navbar />

      {/* ───────── HERO ───────── */}
      <section className="relative pt-28 pb-20 md:pt-36 md:pb-32 overflow-hidden">
        {/* purple→orange gradient background */}
        <div
          className="absolute inset-0 z-0"
          style={{
            background:
              "linear-gradient(135deg, #7C3AED 0%, #a855f7 40%, #F97316 100%)",
          }}
        />
        <div className="absolute inset-0 z-0 bg-black/20" />

        <div className="container relative z-10 mx-auto px-4 md:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial="hidden"
              animate="show"
              variants={stagger}
              className="text-white"
            >
              <motion.span
                variants={fadeUp}
                className="inline-block bg-white/20 text-white text-sm font-semibold px-4 py-1.5 rounded-full mb-6 backdrop-blur-sm border border-white/30"
              >
                🎓 Feito para professores K-12
              </motion.span>

              <motion.h1
                variants={fadeUp}
                className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight mb-6"
              >
                Devolva o tempo <br />
                ao{" "}
                <span className="text-[#FBBF24]">professor</span>
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="text-lg md:text-xl text-white/85 mb-8 max-w-lg leading-relaxed"
              >
                O caderno digital que transforma horas perdidas em tempo de
                ensino. Chamada, diário, atividades e relatórios — tudo em um
                só lugar. Rápido, sem fricção, sem burocracia.
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 mb-10">
                <a href="/web/" data-testid="link-hero-cta">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto bg-[#FBBF24] hover:bg-[#f59e0b] text-[#1E1B4B] font-bold text-lg h-14 px-8 shadow-xl shadow-black/20 border-0"
                  >
                    Acessar o PedagoDIA
                  </Button>
                </a>
                <div className="flex items-center gap-2 text-white/75 text-sm">
                  <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                  Em breve na App Store &amp; Google Play
                </div>
              </motion.div>

              <motion.div variants={fadeUp} className="flex items-center gap-3 text-white/80 text-sm font-medium">
                <div className="flex -space-x-2">
                  {["#7C3AED", "#F97316", "#FBBF24", "#a855f7"].map((bg, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full ring-2 ring-white/40 flex items-center justify-center text-white font-bold text-xs"
                      style={{ background: bg }}
                    >
                      {["M", "R", "A", "C"][i]}
                    </div>
                  ))}
                </div>
                <span>+5.000 professores já usam diariamente</span>
              </motion.div>
            </motion.div>

            {/* Floating phone mockup — Chamada screenshot */}
            <motion.div
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative flex justify-center lg:justify-end"
            >
              <div className="relative">
                <div className="absolute -inset-6 bg-white/10 blur-2xl rounded-full" />
                <PhoneFrame
                  src="/screenshots/chamada.jpeg"
                  alt="Chamada de presença no PedagoDIA"
                  className="rotate-[-3deg] hover:rotate-0 transition-transform duration-500"
                />
                {/* Floating badge */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="absolute -bottom-4 -left-4 md:-left-8 bg-white rounded-2xl shadow-2xl p-3 flex items-center gap-3 z-30 border border-gray-100"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#FBBF24]/20 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-[#F97316]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Economize até</p>
                    <p className="text-lg font-extrabold text-[#7C3AED]">10h por semana</p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ───────── O PROBLEMA ───────── */}
      <section className="py-24 bg-[#1E1B4B]">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.p variants={fadeUp} className="text-[#FBBF24] font-semibold text-sm uppercase tracking-widest mb-3">
              O Problema
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold text-white">
              Professores perdem horas com o que deveria ser automático
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            variants={stagger}
            className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto"
          >
            {[
              {
                num: "01",
                icon: <Clock className="w-6 h-6" />,
                title: "Chamada Manual",
                desc: "Anotar presença em papel, calcular faltas manualmente, transcrever para planilhas. Minutos preciosos perdidos em cada aula.",
              },
              {
                num: "02",
                icon: <BookOpen className="w-6 h-6" />,
                title: "Planejamento Demorado",
                desc: "Horas elaborando planos de aula do zero, sem assistência. Tempo que poderia ser dedicado à preparação pedagógica real.",
              },
              {
                num: "03",
                icon: <FileText className="w-6 h-6" />,
                title: "Burocracia Asfixiante",
                desc: "Relatórios, diários de classe e documentações empilhadas. A papelada toma espaço que deveria ser do aprendizado.",
              },
            ].map((card) => (
              <motion.div
                key={card.num}
                variants={fadeUp}
                className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm hover:bg-white/10 transition-colors"
              >
                <div className="flex items-start gap-4 mb-6">
                  <span className="text-5xl font-black text-[#7C3AED]/40 leading-none select-none">
                    {card.num}
                  </span>
                  <div className="w-12 h-12 rounded-xl bg-[#7C3AED]/30 flex items-center justify-center text-[#a78bfa]">
                    {card.icon}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{card.title}</h3>
                <p className="text-white/60 leading-relaxed">{card.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ───────── APP SCREENS SHOWCASE (6 screenshots) ───────── */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.p variants={fadeUp} className="text-[#F97316] font-semibold text-sm uppercase tracking-widest mb-3">
              O Aplicativo
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold text-foreground">
              Tudo que você precisa, num só lugar
            </motion.h2>
            <motion.p variants={fadeUp} className="text-muted-foreground text-lg mt-4 max-w-xl mx-auto">
              Conheça as telas do PedagoDIA e veja como é simples gerenciar sua turma no dia a dia.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            variants={stagger}
            className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-12 items-start max-w-5xl mx-auto"
          >
            {[
              { src: "/screenshots/menu.jpeg", caption: "Tudo centralizado", label: "Menu Principal" },
              { src: "/screenshots/chamada.jpeg", caption: "Chamada com 1 clique", label: "Chamada" },
              { src: "/screenshots/atividades.jpeg", caption: "Controle de entregas", label: "Atividades" },
              { src: "/screenshots/diario.jpeg", caption: "Histórico completo", label: "Diário" },
              { src: "/screenshots/relatorio-aluno.jpeg", caption: "Acompanhamento por aluno", label: "Relatório do Aluno" },
            ].map((screen) => (
              <motion.div key={screen.src} variants={fadeUp} className="flex flex-col items-center gap-4">
                <PhoneFrame src={screen.src} alt={screen.label} />
                <div className="text-center">
                  <p className="font-semibold text-foreground text-sm">{screen.caption}</p>
                  <p className="text-xs text-muted-foreground">{screen.label}</p>
                </div>
              </motion.div>
            ))}
            {/* Web report — spans 2 cols on mobile, centered on md */}
            <motion.div variants={fadeUp} className="flex flex-col items-center gap-4 col-span-2 md:col-span-1">
              <LaptopFrame src="/screenshots/relatorio-web.png" alt="Relatório Web" />
              <div className="text-center">
                <p className="font-semibold text-foreground text-sm">Relatório web completo</p>
                <p className="text-xs text-muted-foreground">Painel Web</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ───────── VERSÃO WEB E APP ───────── */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.p variants={fadeUp} className="text-[#7C3AED] font-semibold text-sm uppercase tracking-widest mb-3">
              Disponível em
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold text-foreground">
              Versão Web e App
            </motion.h2>
            <motion.p variants={fadeUp} className="text-muted-foreground text-lg mt-4 max-w-xl mx-auto">
              Gerencie sua turma pelo celular em sala de aula, e aprofunde análises no computador. Uma conta, duas experiências completas.
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Plataforma Web */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100 flex flex-col items-start"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-[#7C3AED]/10 flex items-center justify-center">
                  <Monitor className="w-6 h-6 text-[#7C3AED]" />
                </div>
                <div>
                  <span className="inline-block bg-[#7C3AED]/10 text-[#7C3AED] text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide mb-1">
                    Disponível agora
                  </span>
                  <h3 className="text-xl font-bold text-gray-900">Plataforma Web</h3>
                </div>
              </div>
              <p className="text-gray-600 leading-relaxed mb-6">
                Acesse pelo navegador, em qualquer computador ou tablet. Relatórios de desempenho, gestão de turmas, diário de classe e planejamento — com visão completa da sua escola.
              </p>
              <div className="mt-auto w-full overflow-hidden rounded-xl border border-gray-100">
                <img
                  src="/screenshots/relatorio-web.png"
                  alt="Plataforma Web PedagoDIA"
                  className="w-full object-cover"
                  data-testid="img-plataforma-web"
                />
              </div>
              <a href="/web/" className="mt-6 w-full" data-testid="link-acessar-web">
                <Button className="w-full bg-[#7C3AED] hover:bg-[#6d28d9] text-white font-bold">
                  Acessar a plataforma →
                </Button>
              </a>
            </motion.div>

            {/* App Android */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-[#1E1B4B] rounded-3xl shadow-xl p-8 flex flex-col items-start"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-[#FBBF24]" />
                </div>
                <div>
                  <span className="inline-block bg-[#FBBF24]/20 text-[#FBBF24] text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide mb-1">
                    Em breve na App Store
                  </span>
                  <h3 className="text-xl font-bold text-white">App Android</h3>
                </div>
              </div>
              <p className="text-white/70 leading-relaxed mb-6">
                Na palma da mão, em sala de aula. Faça a chamada, registre o diário e acompanhe entregas sem precisar de papel ou internet estável. Leve e rápido.
              </p>
              <div className="flex justify-center w-full">
                <PhoneFrame
                  src="/screenshots/menu.jpeg"
                  alt="App PedagoDIA"
                />
              </div>
              <div className="mt-6 w-full flex items-center justify-center gap-2 text-white/50 text-sm">
                <Smartphone className="w-4 h-4" />
                Android disponível · iOS em breve
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ───────── POR QUE SOMOS DIFERENTES? ───────── */}
      <section className="py-24 bg-[#7C3AED]/10">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.p variants={fadeUp} className="text-[#7C3AED] font-semibold text-sm uppercase tracking-widest mb-3">
              Diferenciais
            </motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold text-foreground">
              Por que somos diferentes?
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            variants={stagger}
            className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto"
          >
            {[
              {
                icon: <Zap className="w-7 h-7" />,
                color: "#7C3AED",
                bg: "#7C3AED",
                title: "Simplicidade Extrema",
                desc: "Interface criada para professores, não para engenheiros. Cada funcionalidade está a no máximo 2 toques de distância. Sem curva de aprendizado.",
              },
              {
                icon: <Star className="w-7 h-7" />,
                color: "#F97316",
                bg: "#F97316",
                title: "Auxílio na Rotina",
                desc: "O PedagoDIA aprende com o seu padrão de uso. Com IA, sugere planejamentos de aula e alertas de frequência antes que você precise pedir.",
              },
              {
                icon: <Package className="w-7 h-7" />,
                color: "#FBBF24",
                bg: "#FBBF24",
                title: "Tudo em um só lugar",
                desc: "Chamada, diário, atividades, planejamento e relatórios num único app. Chega de planilhas no Google Drive, cadernos físicos e apps separados.",
              },
            ].map((card) => (
              <motion.div
                key={card.title}
                variants={fadeUp}
                className="bg-white rounded-2xl p-8 shadow-md hover:shadow-xl transition-shadow border border-gray-100"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-6"
                  style={{ background: card.bg }}
                >
                  {card.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{card.title}</h3>
                <p className="text-gray-600 leading-relaxed">{card.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ───────── TRUST BAR ───────── */}
      <section className="py-14 bg-white border-y border-gray-100">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={stagger}
            className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16"
          >
            {[
              { icon: <Users className="w-6 h-6 text-[#7C3AED]" />, label: "Professores reais" },
              { icon: <Star className="w-6 h-6 text-[#F97316]" />, label: "Feedback contínuo" },
              { icon: <Zap className="w-6 h-6 text-[#FBBF24]" />, label: "Só o que importa" },
            ].map((pill) => (
              <motion.div
                key={pill.label}
                variants={fadeUp}
                className="flex items-center gap-3 text-gray-700 font-semibold text-lg"
                data-testid={`trust-pill-${pill.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <span className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center border border-gray-200">
                  {pill.icon}
                </span>
                {pill.label}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ───────── FINAL CTA ───────── */}
      <section className="py-28 relative overflow-hidden">
        <div
          className="absolute inset-0 z-0"
          style={{
            background:
              "linear-gradient(135deg, #1E1B4B 0%, #7C3AED 60%, #F97316 100%)",
          }}
        />
        <div className="container relative z-10 mx-auto px-4 md:px-6 text-center text-white">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 tracking-tight">
              Pronto para transformar <br className="hidden md:block" />
              a sua rotina escolar?
            </motion.h2>
            <motion.p variants={fadeUp} className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
              Junte-se a milhares de educadores que já estão economizando horas todas as semanas com o PedagoDIA.
            </motion.p>
            <motion.div variants={fadeUp}>
              <a href="/web/" data-testid="link-final-cta">
                <Button
                  size="lg"
                  className="bg-[#FBBF24] hover:bg-[#f59e0b] text-[#1E1B4B] font-bold text-lg h-14 px-10 shadow-2xl shadow-black/30 border-0"
                >
                  Acessar o PedagoDIA
                </Button>
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ───────── FOOTER ───────── */}
      <footer className="bg-[#1E1B4B] pt-16 pb-8 border-t border-white/10 text-white/70">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center gap-2 mb-4" data-testid="link-footer-logo">
                <div className="w-8 h-8 rounded-lg bg-[#7C3AED] flex items-center justify-center text-white font-bold text-xl">
                  P
                </div>
                <span className="font-bold text-xl tracking-tight text-white">PedagoDIA</span>
              </Link>
              <p className="text-lg max-w-xs mb-6 text-white/60 leading-relaxed">
                Transformando horas perdidas em tempo de ensino.
              </p>
              <p className="font-medium text-white/80">
                Siga-nos:{" "}
                <a
                  href="https://instagram.com/pedagodia.app"
                  className="text-[#FBBF24] hover:text-[#f59e0b] transition-colors"
                  data-testid="link-social-instagram"
                >
                  @pedagodia.app
                </a>
              </p>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">Produto</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <a href="/web/" className="hover:text-white transition-colors" data-testid="link-footer-web">
                    Plataforma Web
                  </a>
                </li>
                <li>
                  <span className="cursor-not-allowed opacity-40">App Android (Em breve)</span>
                </li>
                <li>
                  <span className="cursor-not-allowed opacity-40">App iOS (Em breve)</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">Contato</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <a href="mailto:contato@pedagodia.com.br" className="hover:text-white transition-colors">
                    contato@pedagodia.com.br
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">Termos de Uso</a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">Política de Privacidade</a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-white/40">
            <p>© {new Date().getFullYear()} PedagoDIA. Todos os direitos reservados.</p>
            <p>Feito com ❤️ para a educação brasileira</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
