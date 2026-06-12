import { Injectable } from "@nestjs/common";
import { DocumentStatus } from "@prisma/client";
import { PrismaService } from "../common/prisma.service";

export type DocumentKind = "pdf" | "docx" | "txt" | "markdown" | "repository";

export interface KnowledgeDocument {
  id: string;
  name: string;
  kind: DocumentKind;
  storagePath: string;
  status: "uploaded" | "parsed" | "chunked" | "embedded" | "indexed" | "failed";
}

@Injectable()
export class KnowledgeService {
  constructor(private readonly prisma: PrismaService) {}

  async add(document: KnowledgeDocument) {
    return this.prisma.document.upsert({
      where: { id: document.id },
      update: {
        name: document.name,
        kind: document.kind,
        storagePath: document.storagePath,
        status: document.status as DocumentStatus
      },
      create: {
        id: document.id,
        name: document.name,
        kind: document.kind,
        storagePath: document.storagePath,
        status: document.status as DocumentStatus
      }
    });
  }

  list() {
    return this.prisma.document.findMany({ orderBy: { updatedAt: "desc" } });
  }
}
