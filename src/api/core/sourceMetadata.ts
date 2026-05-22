import type { SourceMetadata } from "../models/api";

export function createSourceMetadata(name: string, endpoint: string, license?: string): SourceMetadata {
  return { name, endpoint, fetchedAt: new Date().toISOString(), license };
}