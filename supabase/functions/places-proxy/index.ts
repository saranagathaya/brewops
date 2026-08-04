// ══ places-proxy ══
//
// Server-side proxy for Google Places Autocomplete, so the Google API key
// never reaches a browser.
//
// The apps used to load the Maps JavaScript API and run
// google.maps.places.Autocomplete client-side, which requires the key to be
// embedded in public source (it was in shared.js, and therefore also in the
// deployed page and in git). That key can only be defended with HTTP
// referrer restrictions, and a Referer header is set by the client — so it
// deters casual reuse but does not stop a determined caller from spending
// the project's Maps quota. Autocomplete was the ONLY thing either app
// needed the JS API for (outlet distance is local Haversine maths, and
// "View on map" is a plain google.com/maps/search deep link), so moving
// just this one call server-side removes the browser-visible key entirely.
//
// Auth: verify_jwt is OFF in config (same reasoning as payhere-checkout —
// see its header), so this function authenticates the caller itself. That
// check is load-bearing here, not ceremony: without it this endpoint would
// be an open Places proxy, which is the same quota-abuse problem we just
// moved off the client. Both callers are already behind a login (the
// customer Address Manager and the franchisor outlet form), so requiring a
// session costs nothing.
//
// Required function secret (Dashboard → Edge Functions → Secrets):
//   GOOGLE_PLACES_SERVER_KEY   a SECOND Google API key, restricted to
//                              "Places API (New)" with NO referrer
//                              restriction (referrer-restricted keys are
//                              rejected outright by the web service). Keep
//                              it distinct from the old browser key so the
//                              two can be revoked independently.

import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Everything this platform serves is in Sri Lanka (LKR pricing, Sri Lankan
// outlets), so biasing results there keeps suggestions relevant. Widen this
// if a brand ever operates elsewhere.
const REGION_CODES = ["lk"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status, headers: { ...cors, "Content-Type": "application/json" },
    });
  const fail = (status: number, msg: string) => json(status, { error: msg });

  try {
    const googleKey = Deno.env.get("GOOGLE_PLACES_SERVER_KEY");
    const secretKey = Deno.env.get("SB_SECRET_KEY");
    if (!googleKey || !secretKey) return fail(500, "Places lookup is not configured");

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, secretKey);

    // Who is calling? Anonymous callers would turn this into a free,
    // unmetered Places proxy billed to us.
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: { user }, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !user) return fail(401, "Not signed in");

    const { action, input, placeId, sessionToken } = await req.json();

    // One Google "session" spans the keystrokes of a single lookup plus the
    // final details fetch, and is billed as one unit instead of per
    // keystroke. The client generates the token and passes the same one
    // throughout, then discards it after picking.
    if (action === "autocomplete") {
      const q = (input || "").trim();
      if (q.length < 3) return json(200, { suggestions: [] });

      const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Goog-Api-Key": googleKey },
        body: JSON.stringify({
          input: q,
          includedRegionCodes: REGION_CODES,
          ...(sessionToken ? { sessionToken } : {}),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        // Surface Google's own message — a misconfigured key or a project
        // without "Places API (New)" enabled fails here, and a generic
        // error would make that near-impossible to diagnose.
        return fail(502, body?.error?.message || "Places lookup failed");
      }
      return json(200, {
        suggestions: (body.suggestions || [])
          .filter((s: Record<string, unknown>) => s.placePrediction)
          .map((s: { placePrediction: { placeId: string; text?: { text?: string } } }) => ({
            placeId: s.placePrediction.placeId,
            description: s.placePrediction.text?.text || "",
          })),
      });
    }

    if (action === "details") {
      if (!placeId) return fail(400, "placeId required");
      const url = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`);
      if (sessionToken) url.searchParams.set("sessionToken", sessionToken);
      const res = await fetch(url, {
        headers: {
          "X-Goog-Api-Key": googleKey,
          "X-Goog-FieldMask": "displayName,formattedAddress,location",
        },
      });
      const body = await res.json();
      if (!res.ok) return fail(502, body?.error?.message || "Place lookup failed");

      // Keys deliberately match the shape the old client-side Maps object
      // had, so readablePlaceAddress() (shared.js) keeps working unchanged.
      return json(200, {
        name: body.displayName?.text || "",
        formatted_address: body.formattedAddress || "",
        lat: body.location?.latitude ?? null,
        lng: body.location?.longitude ?? null,
      });
    }

    return fail(400, "Unknown action");
  } catch (e) {
    return fail(500, e instanceof Error ? e.message : "Unexpected error");
  }
});
