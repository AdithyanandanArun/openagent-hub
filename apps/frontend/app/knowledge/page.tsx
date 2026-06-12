import { KnowledgeClient } from "./knowledge-client";

export default function KnowledgePage() {
  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 lg:p-6">
      <header>
        <h1 className="text-2xl font-semibold">Knowledge</h1>
        <p className="text-sm text-muted-foreground">Document records for future parsing, chunking, embedding, and citation retrieval.</p>
      </header>
      <KnowledgeClient />
    </div>
  );
}
