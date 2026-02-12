"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, List, PlusCircle, LogOut, Code2, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleSignOut = async () => {
        await authClient.signOut();
        router.push("/login");
    };

    const navItems = [
        {
            title: "Dashboard",
            href: "/admin/dashboard",
            icon: LayoutDashboard,
        },
        {
            title: "My Quizzes",
            href: "/admin/quizzes",
            icon: List,
        },
        {
            title: "Create Quiz",
            href: "/admin/quiz/new",
            icon: PlusCircle,
        },
        {
            title: "Sessions",
            href: "/admin/sessions",
            icon: List,
        },
    ];

    const isActive = (href: string) =>
        pathname === href || pathname?.startsWith(href + "/");

    return (
        <div className="flex h-screen bg-background">
            {/* Sidebar — Desktop */}
            <aside className="w-64 border-r border-border hidden md:flex flex-col">
                <div className="p-5 border-b border-border">
                    <Link href="/admin/dashboard" className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-primary/10">
                            <Code2 className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="font-bold text-base tracking-tight">DebugQuiz</span>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded">Admin</span>
                        </div>
                    </Link>
                </div>

                <nav className="flex-1 p-3 space-y-1">
                    {navItems.map((item) => (
                        <Link key={item.href} href={item.href}>
                            <div className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group text-sm",
                                isActive(item.href)
                                    ? "bg-primary/10 text-primary font-semibold"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}>
                                <item.icon className={cn(
                                    "h-4 w-4 transition-colors",
                                    isActive(item.href) ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                                )} />
                                <span>{item.title}</span>
                            </div>
                        </Link>
                    ))}
                </nav>

                <div className="p-3 border-t border-border">
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-sm"
                        onClick={handleSignOut}
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                    </Button>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-14 border-b border-border bg-background/95 backdrop-blur-sm flex items-center justify-between px-4 z-50">
                <Link href="/admin/dashboard" className="flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-primary" />
                    <span className="font-bold text-sm">DebugQuiz</span>
                </Link>
                <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                    {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
            </div>

            {/* Mobile Menu Dropdown */}
            {mobileMenuOpen && (
                <div className="md:hidden fixed top-14 left-0 right-0 bg-background border-b border-border z-40 p-3 space-y-1">
                    {navItems.map((item) => (
                        <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                            <div className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm",
                                isActive(item.href)
                                    ? "bg-primary/10 text-primary font-semibold"
                                    : "text-muted-foreground"
                            )}>
                                <item.icon className="h-4 w-4" />
                                <span>{item.title}</span>
                            </div>
                        </Link>
                    ))}
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-muted-foreground hover:text-destructive text-sm mt-2"
                        onClick={() => { handleSignOut(); setMobileMenuOpen(false); }}
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                    </Button>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
                {children}
            </main>
        </div>
    );
}
