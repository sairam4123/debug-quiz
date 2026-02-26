"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Download, FileSpreadsheet, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { type QuestionData } from "../new/components/QuestionEditor";
import { useAlert } from "@/components/providers/alert-provider";

interface BulkUploadProps {
  onQuestionsImported: (questions: QuestionData[]) => void;
  questions?: QuestionData[];
}

export function BulkUpload({
  onQuestionsImported,
  questions = [],
}: BulkUploadProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { alert } = useAlert();

  const headers = [
    "text",
    "type",
    "section",
    "codeSnippet",
    "language",
    "timeLimit",
    "baseScore",
    "option1",
    "option2",
    "option3",
    "option4",
    "correctOption",
  ];

  const handleExport = () => {
    if (!questions.length) return;

    const rows = questions.map((q) => {
      const correctIndexes: string[] = [];
      q.options.forEach((opt, idx) => {
        if (opt.isCorrect) correctIndexes.push(String(idx + 1));
      });

      return {
        text: q.text,
        type: q.type,
        section: q.section || "",
        codeSnippet: q.codeSnippet || "",
        language: q.language || "",
        timeLimit: q.timeLimit ?? "",
        baseScore: q.baseScore ?? "",
        option1: q.options[0]?.text ?? "",
        option2: q.options[1]?.text ?? "",
        option3: q.options[2]?.text ?? "",
        option4: q.options[3]?.text ?? "",
        correctOption: correctIndexes.join(";"),
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
    ws["!cols"] = [
      { wch: 45 },
      { wch: 18 },
      { wch: 18 },
      { wch: 40 },
      { wch: 12 },
      { wch: 10 },
      { wch: 10 },
      { wch: 25 },
      { wch: 25 },
      { wch: 25 },
      { wch: 25 },
      { wch: 12 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Quiz");
    XLSX.writeFile(wb, "quiz-export.csv", { bookType: "csv" });
  };

  const handleDownloadTemplate = () => {
    const sampleData = [
      [
        "Which primitive type represents a logical entity?",
        "KNOWLEDGE",
        "Basics",
        "", // no code snippet for KNOWLEDGE
        "", // no language
        "10",
        "1000",
        "string",
        "boolean",
        "number",
        "undefined",
        "2",
      ],
      [
        "What is the output of this program?",
        "PROGRAM_OUTPUT",
        "Reversal",
        "x = [1, 2, 3]\nprint(x[::-1])",
        "python",
        "15",
        "1000",
        "[3, 2, 1]",
        "[1, 2, 3]",
        "[1, 3, 2]",
        "Error",
        "1",
      ],
      [
        "Find and fix the bug in this code",
        "CODE_CORRECTION",
        "Bugs",
        "function greet(name) {\n  console.log('Hello ' + Name);\n}",
        "javascript",
        "20",
        "1000",
        "Change Name to name",
        "Add return statement",
        "Add semicolon after function",
        "Change console.log to print",
        "1",
      ],
      [
        "Which of the following are valid Python data types?",
        "KNOWLEDGE",
        "Python",
        "",
        "",
        "15",
        "1000",
        "int",
        "float",
        "char",
        "str",
        "1;2;4", // Multiple correct: int, float, str
      ],
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);

    // Add column widths
    const sheet = ws as any;
    sheet["!cols"] = [
      { wch: 45 }, // text
      { wch: 18 }, // type
      { wch: 18 }, // section
      { wch: 40 }, // codeSnippet
      { wch: 12 }, // language
      { wch: 10 }, // timeLimit
      { wch: 10 }, // baseScore
      { wch: 25 }, // opt1
      { wch: 25 }, // opt2
      { wch: 25 }, // opt3
      { wch: 25 }, // opt4
      { wch: 12 }, // correct
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
          // Parse correctOption — supports single ("2") or multiple ("1;3")
          const correctStr = row.correctOption?.toString() || "";
          const correctSet = new Set(
            correctStr
              .split(";")
              .map((s: string) => s.trim())
              .filter(Boolean),
          );

          const options = [
            {
              text: row.option1?.toString() || "",
              isCorrect: correctSet.has("1"),
            },
            {
              text: row.option2?.toString() || "",
              isCorrect: correctSet.has("2"),
            },
            {
              text: row.option3?.toString() || "",
              isCorrect: correctSet.has("3"),
            },
            {
              text: row.option4?.toString() || "",
              isCorrect: correctSet.has("4"),
            },
          ].filter((opt) => opt.text.trim() !== ""); // Filter out empty options if any

          // Fallback defaults
          const type = [
            "KNOWLEDGE",
            "PROGRAM_OUTPUT",
            "CODE_CORRECTION",
          ].includes(row.type)
            ? row.type
            : "KNOWLEDGE";

          // Parse section, code snippet, language (backward compatible with older templates lacking section)
          const section =
            row.section?.toString().trim() ||
            row.Section?.toString().trim() ||
            row.sectionName?.toString().trim() ||
            row.SectionName?.toString().trim() ||
            undefined;
          const codeSnippet = row.codeSnippet?.toString().trim() || undefined;
          const language =
            row.language?.toString().trim().toLowerCase() || undefined;

          return {
            text: row.text || "Untitled Question",
            type: type as any,
            codeSnippet,
            language,
            section,
            timeLimit: parseInt(row.timeLimit || "10"),
            baseScore: parseInt(row.baseScore || "1000"),
            options:
              options.length >= 2
                ? options
                : [
                    { text: "True", isCorrect: true },
                    { text: "False", isCorrect: false },
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

      <Button
        variant="outline"
        onClick={handleExport}
        size="sm"
        disabled={questions.length === 0}
        title={
          questions.length === 0
            ? "Add questions to export"
            : "Export current questions to CSV"
        }
      >
        <FileSpreadsheet className="mr-2 h-4 w-4" /> Export CSV
      </Button>

      <div className="relative">
        <input
          type="file"
          accept=".xlsx, .xls, .csv"
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          onChange={handleFileUpload}
          disabled={isLoading}
        />
        <Button variant="secondary" size="sm" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          Bulk Upload
        </Button>
      </div>
    </div>
  );
}
