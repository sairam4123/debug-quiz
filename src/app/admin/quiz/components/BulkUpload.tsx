"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Download, FileSpreadsheet, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { type QuestionData } from "../new/components/QuestionEditor";
import { useAlert } from "@/components/providers/alert-provider";

interface BulkUploadProps {
    onQuestionsImported: (questions: QuestionData[]) => void;
}

export function BulkUpload({ onQuestionsImported }: BulkUploadProps) {
    const [isLoading, setIsLoading] = useState(false);
    const { alert } = useAlert();

    const handleDownloadTemplate = () => {
        const headers = [
            "text",
            "type", // KNOWLEDGE, PROGRAM_OUTPUT, CODE_CORRECTION
            "timeLimit",
            "baseScore",
            "option1",
            "option2",
            "option3",
            "option4",
            "correctOption" // 1, 2, 3, or 4
        ];

        const sampleData = [
            [
                "Which primitive type represents a logical entity?",
                "KNOWLEDGE",
                "10",
                "1000",
                "string",
                "boolean",
                "number",
                "undefined",
                "2"
            ]
        ];

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);

        // Add column widths
        const sheet = ws as any;
        sheet['!cols'] = [
            { wch: 40 }, // text
            { wch: 15 }, // type
            { wch: 10 }, // timeLimit
            { wch: 10 }, // baseScore
            { wch: 20 }, // opt1
            { wch: 20 }, // opt2
            { wch: 20 }, // opt3
            { wch: 20 }, // opt4
            { wch: 10 }, // correct
        ];

        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "quiz-template.xlsx");
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        const reader = new FileReader();

        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result as ArrayBuffer;
                const wb = XLSX.read(bstr, { type: "array" });
                const wsname = wb.SheetNames[0]!;
                const ws = wb.Sheets[wsname]!;
                const data = XLSX.utils.sheet_to_json(ws);

                if (!data || data.length === 0) {
                    await alert("No data found in file");
                    setIsLoading(false);
                    return;
                }

                const parsedQuestions: QuestionData[] = data.map((row: any) => {
                    // Basic validation and mapping
                    const options = [
                        { text: row.option1?.toString() || "", isCorrect: row.correctOption == 1 },
                        { text: row.option2?.toString() || "", isCorrect: row.correctOption == 2 },
                        { text: row.option3?.toString() || "", isCorrect: row.correctOption == 3 },
                        { text: row.option4?.toString() || "", isCorrect: row.correctOption == 4 },
                    ].filter(opt => opt.text.trim() !== ""); // Filter out empty options if any

                    // Fallback defaults
                    const type = ["KNOWLEDGE", "PROGRAM_OUTPUT", "CODE_CORRECTION"].includes(row.type)
                        ? row.type
                        : "KNOWLEDGE";

                    return {
                        text: row.text || "Untitled Question",
                        type: type as any,
                        timeLimit: parseInt(row.timeLimit || "10"),
                        baseScore: parseInt(row.baseScore || "1000"),
                        options: options.length >= 2 ? options : [
                            { text: "True", isCorrect: true },
                            { text: "False", isCorrect: false }
                        ], // Default options if missing
                    };
                });

                onQuestionsImported(parsedQuestions);
            } catch (error) {
                console.error("Error parsing file:", error);
                await alert("Failed to parse file. Please check the format.");
            } finally {
                setIsLoading(false);
                // Reset input
                e.target.value = "";
            }
        };

        reader.readAsArrayBuffer(file);
    };

    return (
        <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleDownloadTemplate} size="sm">
                <Download className="mr-2 h-4 w-4" /> Template
            </Button>

            <div className="relative">
                <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleFileUpload}
                    disabled={isLoading}
                />
                <Button variant="secondary" size="sm" disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    Bulk Upload
                </Button>
            </div>
        </div>
    );
}
