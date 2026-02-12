"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { api } from "@mce-quiz/trpc/react";
import { Users, Play, Plus, Settings } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

export default function AdminDashboard() {
    const { data: stats, isLoading } = api.admin.getDashboardStats.useQuery();

    return (
        <div className="container mx-auto p-6 space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
                <Link href="/admin/quiz/new">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> Create New Quiz
                    </Button>
                </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Quizzes</CardTitle>
                        <Settings className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex items-center space-x-2 text-muted-foreground">
                                <Spinner size="sm" />
                                <span>Loading...</span>
                            </div>
                        ) : (
                            <div className="text-2xl font-bold">{stats?.totalQuizzes || 0}</div>
                        )}
                        <p className="text-xs text-muted-foreground">
                            +20.1% from last month
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
                        <Play className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex items-center space-x-2 text-muted-foreground">
                                <Spinner size="sm" />
                                <span>Loading...</span>
                            </div>
                        ) : (
                            <div className="text-2xl font-bold">{stats?.activeSessions || 0}</div>
                        )}
                        <p className="text-xs text-muted-foreground">
                            +180.1% from last month
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Players</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex items-center space-x-2 text-muted-foreground">
                                <Spinner size="sm" />
                                <span>Loading...</span>
                            </div>
                        ) : (
                            <div className="text-2xl font-bold">{stats?.totalPlayers || 0}</div>
                        )}
                        <p className="text-xs text-muted-foreground">
                            +19% from last month
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
