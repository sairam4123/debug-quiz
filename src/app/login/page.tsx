"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useAlert } from "@/components/providers/alert-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Spinner } from "@/components/ui/spinner";
import { Code2, ArrowLeft } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const { alert } = useAlert();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleEmailSignIn = async () => {
        setIsLoading(true);
        const { data, error } = await authClient.signIn.email({
            email,
            password,
        });

        if (error) {
            await alert(error.message || "An unknown error occurred", "Sign In Failed");
        } else {
            router.push("/admin/dashboard");
        }
        setIsLoading(false);
    };

    return (
        <div className="flex min-h-screen">
            {/* Left branded panel — hidden on mobile */}
            <div className="hidden lg:flex lg:w-[45%] flex-col justify-between bg-gradient-to-br from-[#0d4a4a] to-[#0891b2] p-12 text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-[20%] left-[10%] w-64 h-64 rounded-full bg-white/20 blur-3xl" />
                    <div className="absolute bottom-[10%] right-[10%] w-80 h-80 rounded-full bg-cyan-300/20 blur-3xl" />
                </div>
                <div className="relative z-10">
                    <Link href="/" className="flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-12">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="text-sm">Back to home</span>
                    </Link>
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2 rounded-lg bg-white/10">
                            <Code2 className="h-6 w-6" />
                        </div>
                        <span className="font-bold text-lg">Debug Quiz</span>
                    </div>
                    <h2 className="text-3xl font-bold leading-tight mb-4">
                        Welcome back to<br />the quiz platform.
                    </h2>
                    <p className="text-white/70 text-lg leading-relaxed">
                        Manage your quizzes, monitor live sessions, and track student performance — all in one place.
                    </p>
                </div>
                <p className="relative z-10 text-sm text-white/40">
                    MCE Quiz Platform
                </p>
            </div>

            {/* Right form panel */}
            <div className="flex-1 flex items-center justify-center p-6 relative">
                {/* Decorative background */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-32 -right-32 w-72 h-72 rounded-full bg-teal-500/5 blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-cyan-500/5 blur-3xl" />
                </div>

                <div className="w-full max-w-md space-y-6 relative z-10">
                    {/* Mobile back link */}
                    <Link href="/" className="lg:hidden flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="text-sm">Back to home</span>
                    </Link>

                    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
                        <CardHeader className="space-y-1">
                            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 dark:from-teal-400 dark:to-cyan-400 bg-clip-text text-transparent">Sign in</CardTitle>
                            <CardDescription>Enter your credentials to access the admin panel</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input
                                    type="email"
                                    placeholder="admin@mce.edu"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="h-11"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Password</Label>
                                <Input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="h-11"
                                />
                            </div>
                            <Button
                                className="w-full h-11 font-semibold bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg shadow-teal-500/15 border-0"
                                onClick={handleEmailSignIn}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Spinner className="mr-2" size="sm" /> Signing in...
                                    </>
                                ) : (
                                    "Sign In"
                                )}
                            </Button>
                        </CardContent>
                        <CardFooter className="flex justify-center">
                            <p className="text-sm text-muted-foreground">
                                Don't have an account?{" "}
                                <Link href="/signup" className="text-teal-600 dark:text-teal-400 font-medium hover:underline">
                                    Sign up
                                </Link>
                            </p>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
}
