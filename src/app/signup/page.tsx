"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Spinner } from "@/components/ui/spinner";
import { Code2, ArrowLeft } from "lucide-react";

export default function SignupPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSignUp = async () => {
        setIsLoading(true);
        const { data, error } = await authClient.signUp.email({
            email,
            password,
            name,
        });

        if (error) {
            alert(error.message);
        } else {
            router.push("/admin/dashboard");
        }
        setIsLoading(false);
    };

    return (
        <div className="flex min-h-screen">
            {/* Left branded panel — hidden on mobile */}
            <div className="hidden lg:flex lg:w-[45%] flex-col justify-between bg-gradient-to-br from-[#1a2463] to-[#28388D] p-12 text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-[20%] left-[10%] w-64 h-64 rounded-full bg-white/20 blur-3xl" />
                    <div className="absolute bottom-[10%] right-[10%] w-80 h-80 rounded-full bg-white/10 blur-3xl" />
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
                        Create your<br />admin account.
                    </h2>
                    <p className="text-white/70 text-lg leading-relaxed">
                        Set up quizzes, run live sessions, and engage your students with interactive debugging challenges.
                    </p>
                </div>
                <p className="relative z-10 text-sm text-white/40">
                    MCE Quiz Platform
                </p>
            </div>

            {/* Right form panel */}
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-md space-y-6">
                    <Link href="/" className="lg:hidden flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="text-sm">Back to home</span>
                    </Link>

                    <Card className="border-border/50">
                        <CardHeader className="space-y-1">
                            <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
                            <CardDescription>Enter your details to get started</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Name</Label>
                                <Input
                                    placeholder="John Doe"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="h-11"
                                />
                            </div>
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
                            <Button className="w-full h-11 font-semibold" onClick={handleSignUp} disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Spinner className="mr-2" size="sm" /> Creating account...
                                    </>
                                ) : (
                                    "Sign Up"
                                )}
                            </Button>
                        </CardContent>
                        <CardFooter className="flex justify-center">
                            <p className="text-sm text-muted-foreground">
                                Already have an account?{" "}
                                <Link href="/login" className="text-primary font-medium hover:underline">
                                    Login
                                </Link>
                            </p>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
}
