import type { ContextPack } from "../types";

export function validateContextPack(ctx: Partial<ContextPack>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!ctx.committee?.trim()) errors.push("Committee name is required");
  if (!ctx.agenda?.trim()) errors.push("Agenda/topic is required");
  if (!ctx.country?.trim()) errors.push("Country name is required");

  return { valid: errors.length === 0, errors };
}

export function validateSpeech(content: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!content.trim()) errors.push("Speech content cannot be empty");
  if (content.trim().length < 50) errors.push("Speech seems too short — add more substance");
  return { valid: errors.length === 0, errors };
}

export function validateClause(text: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!text.trim()) errors.push("Clause text cannot be empty");
  if (!text.trim().endsWith(";") && !text.trim().endsWith(",")) {
    errors.push("Operative clauses should end with a semicolon (;)");
  }
  return { valid: errors.length === 0, errors };
}
