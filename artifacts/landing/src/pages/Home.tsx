import { Link } from "wouter";
import { Navbar } from "@/components/Navbar";
import { PhoneFrame } from "@/components/PhoneFrame";
import { LaptopFrame } from "@/components/LaptopFrame";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { 
  CheckCircle2, 
  Clock, 
  CalendarDays, 
  BookOpen, 
  BarChart3, 
  Sparkles,
  ShieldCheck
} from "lucide-react";

export default function Home() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="min-h-screen bg-background font-sans overflow-x-hidden">
      <Navbar />

      <main>
        {/* HERO SECTION */}
        <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background z-0"></div>
          <div className="container relative z-10 mx-auto px-4 md:px-6">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
              <motion.div 
                className="max-w-2xl"
                initial="hidden"
                animate="show"
                variants={container}
              >
                <motion.div variants={item} className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary/10 text-primary mb-6">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Feito para professores K-12
                </motion.div>
                <motion.h1 variants={item} className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground mb-6 leading-[1.1]">
                  Devolva o tempo <br className="hidden md:block"/> ao <span className="text-primary">professor</span>
                </motion.h1>
                <motion.p variants={item} className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
                  O caderno digital que transforma horas perdidas em tempo de ensino. Chamada, diário, atividades e relatórios, tudo em um só lugar. Rápido, sem fricção e sem burocracia.
                </motion.p>
                <motion.div variants={item} className="flex flex-col sm:flex-row gap-4">
                  <a href="/web/" data-testid="link-hero-cta">
                    <Button size="lg" className="w-full sm:w-auto text-lg h-14 px-8 font-bold shadow-lg shadow-primary/25">
                      Acessar o PedagoDIA
                    </Button>
                  </a>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center sm:justify-start">
                    <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
                    Em breve na App Store & Google Play
                  </div>
                </motion.div>
                <motion.div variants={item} className="mt-10 flex items-center gap-4 text-sm font-medium text-foreground">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-background bg-muted flex items-center justify-center text-xs overflow-hidden">
                         <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${i}&backgroundColor=7c3aed`} alt="User avatar" />
                      </div>
                    ))}
                  </div>
                  <p>Mais de 5.000 professores usam diariamente</p>
                </motion.div>
              </motion.div>

              <motion.div 
                className="relative lg:ml-auto"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                <div className="absolute -inset-4 bg-gradient-to-r from-primary to-accent opacity-20 blur-2xl rounded-[3rem]"></div>
                <PhoneFrame 
                  src="/screenshots/menu.jpeg" 
                  alt="PedagoDIA Menu Principal"
                  className="rotate-[-2deg] hover:rotate-0 transition-transform duration-500 ease-out" 
                />
                
                {/* Floating badge */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  className="absolute -bottom-6 -left-6 md:left-10 bg-white p-4 rounded-xl shadow-xl border border-gray-100 flex items-center gap-4 z-30"
                >
                  <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center text-accent">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Economize até</p>
                    <p className="text-xl font-extrabold text-accent">10h por semana</p>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* LOGOS / TRUST */}
        <section className="py-10 border-y border-border bg-muted/30">
          <div className="container mx-auto px-4 text-center">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6">Problemas que resolvemos todos os dias</p>
            <div className="flex flex-wrap justify-center gap-6 md:gap-12 opacity-70">
              <div className="flex items-center gap-2 font-bold text-foreground text-lg"><Clock className="w-5 h-5 text-destructive"/> Chamada manual demorada</div>
              <div className="flex items-center gap-2 font-bold text-foreground text-lg"><BookOpen className="w-5 h-5 text-accent"/> Planejamento lento</div>
              <div className="flex items-center gap-2 font-bold text-foreground text-lg"><CalendarDays className="w-5 h-5 text-primary"/> Burocracia sufocante</div>
            </div>
          </div>
        </section>

        {/* FEATURES GRID */}
        <section className="py-24 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
                Tudo centralizado. <br/>Apenas o que importa.
              </h2>
              <p className="text-lg text-muted-foreground">
                Diga adeus as planilhas espalhadas e papéis que se perdem. O PedagoDIA foi desenhado com simplicidade e assistência a rotina diária em mente.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center mb-24">
              <div className="order-2 md:order-1">
                <motion.div 
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, margin: "-100px" }}
                  variants={container}
                  className="space-y-8"
                >
                  <motion.div variants={item}>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Chamada com 1 clique</h3>
                    <p className="text-muted-foreground text-lg leading-relaxed">
                      Registre presenças, faltas e atrasos em segundos. Sem carregar cadernos pesados, sem perder tempo no início da aula. A sincronização é automática.
                    </p>
                  </motion.div>
                  <motion.div variants={item}>
                    <div className="w-12 h-12 rounded-xl bg-secondary/10 text-secondary-foreground flex items-center justify-center mb-4">
                      <CalendarDays className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Histórico completo</h3>
                    <p className="text-muted-foreground text-lg leading-relaxed">
                      Seu diário de classe sempre com você. Anote o que foi dado em sala, adicione observações sobre turmas e mantenha tudo documentado sem esforço.
                    </p>
                  </motion.div>
                </motion.div>
              </div>
              <div className="order-1 md:order-2 relative">
                <div className="absolute inset-0 bg-primary/5 rounded-[3rem] transform -rotate-3 scale-105"></div>
                <PhoneFrame src="/screenshots/chamada.jpeg" alt="Tela de Chamada" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
              <div className="relative">
                <div className="absolute inset-0 bg-accent/5 rounded-[3rem] transform rotate-3 scale-105"></div>
                <PhoneFrame src="/screenshots/atividades.jpeg" alt="Controle de Entregas" />
              </div>
              <div>
                <motion.div 
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, margin: "-100px" }}
                  variants={container}
                  className="space-y-8"
                >
                  <motion.div variants={item}>
                    <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center mb-4">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Controle de entregas</h3>
                    <p className="text-muted-foreground text-lg leading-relaxed">
                      Gerencie trabalhos, provas e tarefas de casa. Saiba exatamente quem entregou, quem faltou e as notas parciais, sem planilhas complexas.
                    </p>
                  </motion.div>
                  <motion.div variants={item}>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                      <BarChart3 className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">Acompanhamento por aluno</h3>
                    <p className="text-muted-foreground text-lg leading-relaxed">
                      Tenha uma visão 360° de cada estudante na palma da mão. Faltas, notas e comportamento para reuniões de pais e conselhos de classe.
                    </p>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* DESKTOP DASHBOARD FEATURE */}
        <section className="py-24 bg-[var(--background)] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-muted/50 to-transparent"></div>
          <div className="container relative z-10 mx-auto px-4 md:px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm font-semibold bg-secondary/20 text-secondary-foreground mb-6">
                Para Coordenadores e Diretores
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-6">
                Relatório web completo
              </h2>
              <p className="text-lg text-muted-foreground">
                Além do app no celular para a sala de aula, o PedagoDIA oferece um painel poderoso na web para análises profundas, planejamento de longo prazo e exportação de dados.
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <LaptopFrame src="/screenshots/relatorio-web.png" alt="Relatório Web PedagoDIA" />
            </motion.div>
          </div>
        </section>

        {/* TESTIMONIALS / TRUST */}
        <section className="py-24 bg-[#1E1B4B] text-white">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-12">Construído com feedback contínuo de quem vive a sala de aula</h2>
            
            <div className="grid md:grid-cols-3 gap-8 text-left max-w-5xl mx-auto">
              <div className="bg-white/10 border border-white/20 p-6 rounded-2xl backdrop-blur-sm">
                <div className="flex items-center gap-1 text-secondary mb-4">
                  {[1,2,3,4,5].map(i => <Sparkles key={i} className="w-4 h-4 fill-current" />)}
                </div>
                <p className="text-lg text-gray-200 mb-6">"O aplicativo é muito intuitivo. Consigo fazer a chamada nos 2 primeiros minutos da aula. Salvou muito o meu tempo que antes era gasto com papelada."</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center font-bold text-white">M</div>
                  <div>
                    <p className="font-bold text-white">Mariana S.</p>
                    <p className="text-sm text-gray-400">Professora de História</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/10 border border-white/20 p-6 rounded-2xl backdrop-blur-sm">
                <div className="flex items-center gap-1 text-secondary mb-4">
                  {[1,2,3,4,5].map(i => <Sparkles key={i} className="w-4 h-4 fill-current" />)}
                </div>
                <p className="text-lg text-gray-200 mb-6">"A visualização do relatório de alunos é perfeita para as reuniões de pais. Tenho os dados de todos eles sempre a mão."</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center font-bold text-white">R</div>
                  <div>
                    <p className="font-bold text-white">Roberto T.</p>
                    <p className="text-sm text-gray-400">Professor de Matemática</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 border border-white/20 p-6 rounded-2xl backdrop-blur-sm">
                <div className="flex items-center gap-1 text-secondary mb-4">
                  {[1,2,3,4,5].map(i => <Sparkles key={i} className="w-4 h-4 fill-current" />)}
                </div>
                <p className="text-lg text-gray-200 mb-6">"Simplicidade é a palavra. O PedagoDIA tirou o peso da rotina e me deixou focar no que realmente importa: ensinar."</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold text-[#1E1B4B]">A</div>
                  <div>
                    <p className="font-bold text-white">Ana Lúcia</p>
                    <p className="text-sm text-gray-400">Coordenadora</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-16 inline-flex items-center gap-2 text-primary-foreground font-semibold">
              <ShieldCheck className="w-5 h-5 text-secondary" />
              Privacidade e segurança em primeiro lugar
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-primary z-0"></div>
          <div className="absolute inset-0 bg-[url('https://api.dicebear.com/7.x/shapes/svg?seed=PedagoDIA&backgroundColor=transparent')] opacity-10 mix-blend-overlay z-0"></div>
          
          <div className="container relative z-10 mx-auto px-4 md:px-6 text-center text-primary-foreground">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 tracking-tight">Pronto para transformar <br/>a sua rotina escolar?</h2>
            <p className="text-xl md:text-2xl mb-10 text-primary-foreground/80 max-w-2xl mx-auto">
              Junte-se a milhares de educadores que já estão economizando horas todas as semanas com o PedagoDIA.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <a href="/web/" data-testid="link-final-cta">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto text-lg h-14 px-8 font-bold">
                  Acessar o PedagoDIA
                </Button>
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-[#1E1B4B] pt-16 pb-8 border-t border-white/10 text-white/70">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center gap-2 mb-4" data-testid="link-footer-logo">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xl">
                  P
                </div>
                <span className="font-bold text-xl tracking-tight text-white">PedagoDIA</span>
              </Link>
              <p className="text-lg max-w-xs mb-6 text-gray-400">
                Transformando horas perdidas em tempo de ensino.
              </p>
              <p className="font-medium text-white">Siga-nos: <a href="https://instagram.com/pedagodia.app" className="text-secondary hover:text-secondary/80 transition-colors">@pedagodia.app</a></p>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">Produto</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="/web/" className="hover:text-white transition-colors" data-testid="link-footer-web">Plataforma Web</a></li>
                <li><span className="cursor-not-allowed opacity-50">App Android (Em breve)</span></li>
                <li><span className="cursor-not-allowed opacity-50">App iOS (Em breve)</span></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">Contato</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="mailto:contato@pedagodia.com.br" className="hover:text-white transition-colors">contato@pedagodia.com.br</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Termos de Uso</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Política de Privacidade</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
            <p>© {new Date().getFullYear()} PedagoDIA. Todos os direitos reservados.</p>
            <p>Feito com ❤️ para a educação brasileira</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
