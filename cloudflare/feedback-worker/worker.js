const ALLOWED_ORIGINS = new Set([
  "https://insaneweihang.com",
  "https://www.insaneweihang.com",
  "http://localhost:8000",
  "http://localhost:8001",
]);

const VALID_TYPES = new Set(["idea", "bug", "data_issue"]);

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "https://insaneweihang.com";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

function jsonResponse(request, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(request),
    },
  });
}

function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    const url = new URL(request.url);
    if (request.method !== "POST" || url.pathname !== "/feedback") {
      return jsonResponse(request, { ok: false, error: "Not found" }, 404);
    }

    let payload;
    try {
      payload = await request.json();
    } catch (error) {
      return jsonResponse(request, { ok: false, error: "Invalid JSON" }, 400);
    }

    if (payload.website) {
      return jsonResponse(request, { ok: true });
    }

    const type = cleanText(payload.type, 32);
    const title = cleanText(payload.title, 120);
    const message = cleanText(payload.message, 2000);
    const contact = cleanText(payload.contact, 120);
    const pageUrl = cleanText(payload.page_url, 500);
    const userAgent = cleanText(request.headers.get("User-Agent"), 500);

    if (!VALID_TYPES.has(type)) {
      return jsonResponse(request, { ok: false, error: "Invalid feedback type" }, 400);
    }
    if (!title || !message) {
      return jsonResponse(request, { ok: false, error: "Title and message are required" }, 400);
    }

    await env.FEEDBACK_DB.prepare(
      `INSERT INTO feedback (type, title, message, contact, page_url, user_agent)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
      .bind(type, title, message, contact || null, pageUrl || null, userAgent || null)
      .run();

    return jsonResponse(request, { ok: true });
  },
};
