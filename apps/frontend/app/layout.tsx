import type { Metadata } from "next";
import { AppShell } from "../components/app-shell";
import { QueryProvider } from "../components/query-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenAgent Hub",
  description: "Self-hosted AI workspace for providers, agents, MCP, tools, memory, and RAG."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          <AppShell>{children}</AppShell>
        </QueryProvider>
      </body>
    </html>
  );
}
