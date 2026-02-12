import Link from "next/link";
import { Zap, ShieldCheck, Trophy, ArrowRight, Code2 } from "lucide-react";

export default function Home() {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Background decorative elements */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-primary/8 blur-3xl" />
      </div>

      {/* Hero content */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-4 text-center max-w-2xl">
        {/* Logo mark */}
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
            <Code2 className="h-8 w-8 text-primary" />
          </div>
          <span className="text-sm font-semibold tracking-widest uppercase text-muted-foreground">
            MCE Quiz Platform
          </span>
        </div>

        {/* Main headline */}
        <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight leading-[1.1]">
          <span className="text-gradient">Debug</span>{" "}
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
            className="group relative inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-4 text-lg font-bold text-primary-foreground transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(40,56,141,0.4)]"
          >
            <Zap className="h-5 w-5" />
            Join a Game
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-8 py-4 text-lg font-semibold text-foreground transition-all duration-200 hover:bg-accent hover:border-primary/30"
          >
            Admin Login
          </Link>
        </div>
      </div>

      {/* Feature pills */}
      <div className="relative z-10 mt-16 flex flex-wrap items-center justify-center gap-4 px-4">
        {[
          { icon: Zap, label: "Real-time Questions" },
          { icon: ShieldCheck, label: "Anti-cheat Protection" },
          { icon: Trophy, label: "Live Leaderboard" },
        ].map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-2 text-sm text-muted-foreground backdrop-blur-sm"
          >
            <Icon className="h-4 w-4 text-primary" />
            {label}
          </div>
        ))}
      </div>
    </main>
  );
}
