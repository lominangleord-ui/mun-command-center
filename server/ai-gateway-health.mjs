const gateway = process.env.MUN_AI_GATEWAY_URL || "http://127.0.0.1:8787/api/ai/health";
const sourceProbe = process.env.MUN_SOURCE_PROBE_URL || "http://127.0.0.1:8787/api/sources/restcountries/v3.1/name/azerbaijan?fields=name";

try {
  const res = await fetch(gateway, { method: "GET" });
  const text = await res.text();
  let json = {};
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok || json.ok === false) {
    console.error("Gateway health check failed:", json);
    process.exit(1);
  }
  const probe = await fetch(sourceProbe, { method: "GET" });
  if (!probe.ok) {
    console.error("Source proxy health check failed:", `HTTP ${probe.status}`);
    process.exit(1);
  }
  console.log("Gateway health OK:", json.service || "mun-ai-gateway", `uptimeMs=${json.uptimeMs}`, "| source proxy OK");
} catch (error) {
  console.error("Gateway health check failed:", error?.message || error);
  process.exit(1);
}
