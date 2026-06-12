"use client";

import { FileText, Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { apiGet, apiSend } from "../../lib/api";

interface DocumentRecord {
  id: string;
  name: string;
  kind: "pdf" | "docx" | "txt" | "markdown" | "repository";
  storagePath: string;
  status: string;
}

export function KnowledgeClient() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<DocumentRecord["kind"]>("markdown");
  const [storagePath, setStoragePath] = useState("");
  const documents = useQuery({ queryKey: ["documents"], queryFn: () => apiGet<DocumentRecord[]>("/documents") });
  const saveDocument = useMutation({
    mutationFn: () => apiSend<DocumentRecord>("/documents", "POST", { id: slug(name), name, kind, storagePath, status: "uploaded" }),
    onSuccess: async () => {
      setName("");
      setStoragePath("");
      await queryClient.invalidateQueries({ queryKey: ["documents"] });
    }
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveDocument.mutate();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <form className="rounded-md border border-border bg-white p-4" onSubmit={submit}>
        <h2 className="text-sm font-semibold">Register Document</h2>
        <input className="mt-4 h-10 w-full rounded-md border border-border px-3 text-sm" placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} required />
        <select className="mt-3 h-10 w-full rounded-md border border-border bg-white px-3 text-sm" value={kind} onChange={(event) => setKind(event.target.value as DocumentRecord["kind"])}>
          <option value="pdf">PDF</option>
          <option value="docx">DOCX</option>
          <option value="txt">TXT</option>
          <option value="markdown">Markdown</option>
          <option value="repository">Repository</option>
        </select>
        <input className="mt-3 h-10 w-full rounded-md border border-border px-3 text-sm" placeholder="storage/documents/example.md" value={storagePath} onChange={(event) => setStoragePath(event.target.value)} required />
        <button className="mt-3 inline-flex h-10 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground">
          <Plus size={16} aria-hidden />
          Register
        </button>
      </form>
      <section className="grid gap-3 md:grid-cols-2">
        {(documents.data ?? []).map((document) => (
          <div key={document.id} className="rounded-md border border-border bg-white p-4">
            <FileText size={18} aria-hidden />
            <h2 className="mt-3 text-sm font-semibold">{document.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{document.kind} · {document.status}</p>
            <p className="mt-2 truncate text-xs text-muted-foreground">{document.storagePath}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "document";
}
