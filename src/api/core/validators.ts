export function hasString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function hasNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}