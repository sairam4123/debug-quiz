"use client";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText, File } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface DownloadResultsProps {
    session: any; // Using any for now to avoid complex type importation, can be typed strictly if needed
}

export function DownloadResults({ session }: DownloadResultsProps) {

    const getFlattenedData = () => {
        if (!session || !session.players) return [];

        return session.players.map((player: any) => {
            const row: any = {
                Name: player.name,
                Class: player.class,
                Score: player.score,
                "Correct Answers": player.answers?.filter((a: any) => a.isCorrect).length || 0,
                "Total Questions": session.quiz.questions.length,
            };

            session.quiz.questions.forEach((q: any, i: number) => {
                const answer = player.answers?.find((a: any) => a.questionId === q.id);
                row[`Q${i + 1} Score`] = answer ? answer.score : 0;
                row[`Q${i + 1} Time (s)`] = answer ? (answer.timeTaken / 1000).toFixed(1) : "-";
                row[`Q${i + 1} Result`] = answer ? (answer.isCorrect ? "Correct" : "Wrong") : "Skipped";
            });

            return row;
        });
    };

    const exportToExcel = () => {
        const data = getFlattenedData();
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Results");
        XLSX.writeFile(wb, `session-${session.code}-results.xlsx`);
    };

    const exportToCSV = () => {
        const data = getFlattenedData();
        const ws = XLSX.utils.json_to_sheet(data);
        const csv = XLSX.utils.sheet_to_csv(ws);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `session-${session.code}-results.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportToPDF = () => {
        const doc = new jsPDF();

        // Calculate Stats
        const totalPlayers = session.players.length;
        const totalScore = session.players.reduce((acc: number, p: any) => acc + p.score, 0);
        const avgScore = totalPlayers > 0 ? Math.round(totalScore / totalPlayers) : 0;
        const topScore = totalPlayers > 0 ? Math.max(...session.players.map((p: any) => p.score)) : 0;

        let duration = "N/A";
        if (session.startTime && session.endTime) {
            const start = new Date(session.startTime).getTime();
            const end = new Date(session.endTime).getTime();
            const diffMins = Math.round((end - start) / 60000);
            duration = `${diffMins} mins`;
        } else if (session.startTime) {
            const start = new Date(session.startTime).getTime();
            const now = Date.now();
            const diffMins = Math.round((now - start) / 60000);
            duration = `${diffMins} mins (Ongoing)`;
        }


        // Title
        doc.setFontSize(22);
        doc.setTextColor(40, 40, 40);
        doc.text("Quiz Session Report", 14, 20);

        // Quiz Info
        doc.setFontSize(14);
        doc.setTextColor(100);
        doc.text(`${session.quiz.title}`, 14, 30);

        // Meta Info
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Session Code: ${session.code}`, 14, 40);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 45);

        // Summary Box
        doc.setDrawColor(200);
        doc.setFillColor(245, 245, 245);
        doc.rect(14, 55, 180, 25, 'FD');

        doc.setFontSize(10);
        doc.setTextColor(50);

        doc.text("Total Participants", 20, 65);
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(totalPlayers.toString(), 20, 72);

        doc.setFontSize(10);
        doc.setTextColor(50);
        doc.text("Average Score", 70, 65);
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(avgScore.toLocaleString(), 70, 72);

        doc.setFontSize(10);
        doc.setTextColor(50);
        doc.text("Top Score", 120, 65);
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(topScore.toLocaleString(), 120, 72);

        doc.setFontSize(10);
        doc.setTextColor(50);
        doc.text("Duration", 160, 65);
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(duration, 160, 72);

        // Table
        const head = [["Name", "Class", "Score", "Correct", ...session.quiz.questions.map((_: any, i: number) => `Q${i + 1}`)]];
        const body = session.players.map((player: any) => [
            player.name,
            player.class,
            player.score,
            `${player.answers?.filter((a: any) => a.isCorrect).length}/${session.quiz.questions.length}`,
            ...session.quiz.questions.map((q: any) => {
                const answer = player.answers?.find((a: any) => a.questionId === q.id);
                return answer ? (answer.isCorrect ? "Y" : "N") : "-";
            })
        ]);

        autoTable(doc, {
            head: head,
            body: body,
            startY: 90,
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: [66, 66, 66], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [250, 250, 250] },
        });

        doc.save(`session-${session.code}-report.pdf`);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" /> Download Results
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportToExcel}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToCSV}>
                    <FileText className="mr-2 h-4 w-4" /> CSV (.csv)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToPDF}>
                    <File className="mr-2 h-4 w-4" /> PDF (.pdf)
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
