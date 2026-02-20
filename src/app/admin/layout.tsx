"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, List, PlusCircle, LogOut, Code2, Menu, X, Gamepad2, ChevronLeft, ChevronRight } from "lucide-react";
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
    const [collapsed, setCollapsed] = useState(false);
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
            color: "text-primary",
            activeBg: "bg-primary/10",
        },
        {
            title: "My Quizzes",
            href: "/admin/quizzes",
            icon: List,
            color: "text-primary",
            activeBg: "bg-primary/10",
        },
        {
            title: "Create Quiz",
            href: "/admin/quiz/new",
            icon: PlusCircle,
            color: "text-primary",
            activeBg: "bg-primary/10",
        },
        {
            title: "Sessions",
            href: "/admin/sessions",
            icon: Gamepad2,
            color: "text-primary",
            activeBg: "bg-primary/10",
        },
    ];

    const isActive = (href: string) =>
        pathname === href || pathname?.startsWith(href + "/");

    return (
        <div className="flex h-screen bg-background">
            {/* Sidebar — Desktop */}
            <aside className={cn(
                "border-r border-border/50 hidden md:flex flex-col bg-card/50 backdrop-blur-sm transition-all duration-300 ease-in-out",
                collapsed ? "w-[70px]" : "w-64"
            )}>
                <div className={cn("p-4 border-b border-border/50 flex items-center gap-2", collapsed ? "justify-center" : "justify-between")}>
                    <Link href="/admin/dashboard" className="flex items-center gap-2.5 overflow-hidden">
                        <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
                            <Code2 className="h-5 w-5 text-primary" />
                        </div>
                        {!collapsed && (
                            <div className="flex items-baseline gap-1.5 overflow-hidden">
                                <span className="font-bold text-base tracking-tight truncate">DebugQuiz</span>
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded">Admin</span>
                            </div>
                        )}
                    </Link>
                    {!collapsed && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto text-muted-foreground" onClick={() => setCollapsed(true)}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                {/* Collapsed Toggle - centered if collapsed */}
                {collapsed && (
                    <div className="w-full flex justify-center py-2 border-b border-border/50 bg-background/50">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => setCollapsed(false)}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                )}


                <nav className="flex-1 p-3 space-y-1 overflow-y-auto overflow-x-hidden">
                    {navItems.map((item) => (
                        <Link key={item.href} href={item.href}>
                            <div className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-sm whitespace-nowrap",
                                isActive(item.href)
                                    ? `${item.activeBg} ${item.color} font-semibold`
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/80",
                                collapsed && "justify-center px-2"
                            )} title={collapsed ? item.title : undefined}>
                                <item.icon className={cn(
                                    "h-5 w-5 shrink-0 transition-colors",
                                    isActive(item.href) ? item.color : "text-muted-foreground group-hover:text-foreground"
                                )} />
                                {!collapsed && <span className="truncate">{item.title}</span>}
                            </div>
                        </Link>
                    ))}
                </nav>

                <div className="p-3 border-t border-border/50 space-y-2">
                    <Button
                        variant="ghost"
                        className={cn(
                            "w-full text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 text-sm rounded-xl",
                            collapsed ? "justify-center px-0" : "justify-start"
                        )}
                        onClick={handleSignOut}
                        title={collapsed ? "Sign Out" : undefined}
                    >
                        <LogOut className={cn("h-4 w-4 shrink-0", !collapsed && "mr-2")} />
                        {!collapsed && <span>Sign Out</span>}
                    </Button>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-14 border-b border-border/50 bg-background/95 backdrop-blur-sm flex items-center justify-between px-4 z-50">
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
                <div className="md:hidden fixed top-14 left-0 right-0 bg-background/95 backdrop-blur-sm border-b border-border/50 z-40 p-3 space-y-1">
                    {navItems.map((item) => (
                        <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                            <div className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm",
                                isActive(item.href)
                                    ? `${item.activeBg} ${item.color} font-semibold`
                                    : "text-muted-foreground"
                            )}>
                                <item.icon className={cn("h-4 w-4", isActive(item.href) ? item.color : "")} />
                                <span>{item.title}</span>
                            </div>
                        </Link>
                    ))}
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-muted-foreground hover:text-rose-500 text-sm mt-2 rounded-xl"
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
