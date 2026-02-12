import Link from "next/link";
import { Zap, ShieldCheck, Trophy, ArrowRight, Code2, Sparkles, Timer } from "lucide-react";

export default function Home() {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Background decorative elements */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-teal-500/8 blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-cyan-500/6 blur-3xl" />
        <div className="absolute top-1/3 right-[10%] w-[400px] h-[400px] rounded-full bg-amber-500/5 blur-3xl" />
      </div>

      {/* Hero content */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-4 text-center max-w-2xl">
        {/* Logo mark */}
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-teal-500/15 to-cyan-500/15 border border-teal-500/20">
            <Code2 className="h-8 w-8 text-teal-500" />
          </div>
          <span className="text-sm font-semibold tracking-widest uppercase text-muted-foreground">
            MCE Quiz Platform
          </span>
        </div>

        {/* Main headline */}
        <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight leading-[1.1]">
          <span className="bg-gradient-to-r from-teal-600 to-cyan-500 dark:from-teal-400 dark:to-cyan-400 bg-clip-text text-transparent">Debug</span>{" "}
          <span className="text-foreground">Quiz</span>
        </h1>

        <p className="text-lg sm:text-xl text-muted-foreground max-w-lg leading-relaxed">
          Real-time code debugging quizzes for classrooms.
          Compete, learn, and climb the leaderboard.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4 w-full sm:w-auto">
          <Link
            href="/play"
            className="group relative inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-8 py-4 text-lg font-bold text-white transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(20,184,166,0.4)]"
          >
            <Zap className="h-5 w-5" />
            Join a Game
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-8 py-4 text-lg font-semibold text-foreground transition-all duration-200 hover:bg-accent hover:border-teal-500/30"
          >
            Admin Login
          </Link>
        </div>
      </div>

      {/* Feature pills */}
      <div className="relative z-10 mt-16 flex flex-wrap items-center justify-center gap-4 px-4">
        {[
          { icon: Zap, label: "Real-time Questions", color: "text-teal-500" },
          { icon: ShieldCheck, label: "Anti-cheat Protection", color: "text-emerald-500" },
          { icon: Trophy, label: "Live Leaderboard", color: "text-amber-500" },
          { icon: Timer, label: "Timed Challenges", color: "text-sky-500" },
        ].map(({ icon: Icon, label, color }) => (
          <div
            key={label}
            className="flex items-center gap-2 rounded-full border border-border/50 bg-card/60 px-4 py-2 text-sm text-muted-foreground backdrop-blur-sm hover:border-teal-500/30 transition-colors"
          >
            <Icon className={`h-4 w-4 ${color}`} />
            {label}
          </div>
        ))}
      </div>
    </main>
  );
}
