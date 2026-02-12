import "@mce-quiz/styles/globals.css";

import { type Metadata } from "next";
import { Inter } from "next/font/google";

import { TRPCReactProvider } from "@mce-quiz/trpc/react";
import { AlertProvider } from "@/components/providers/alert-provider";

export const metadata: Metadata = {
  title: "Debug Quiz — MCE",
  description: "Real-time code debugging quiz platform for classrooms",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body>
        <TRPCReactProvider>
          <AlertProvider>{children}</AlertProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
