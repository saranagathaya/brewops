// ══ payhere-checkout ══
//
// Returns the signed payment object the customer app passes to
// payhere.startPayment(). This exists because generating PayHere's
// checkout hash requires the MERCHANT SECRET, which must never reach the
// browser — this function is the only place (besides payhere-notify)
// that holds it.
//
// Auth: verify_jwt is OFF in config (the gateway can't verify our
// publishable-key era tokens consistently) — instead the function
// authenticates the caller itself via auth.getUser(), then checks the
// order actually belongs to that user, is a card order, and is unpaid.
//
// Required function secrets (Dashboard → Edge Functions → Secrets):
//   PAYHERE_MERCHANT_ID      from PayHere dashboard (sandbox or live)
//   PAYHERE_MERCHANT_SECRET  ditto — NEVER commit this anywhere
//   PAYHERE_SANDBOX          "true" while testing against sandbox.payhere.lk
//   SB_SECRET_KEY            a Supabase sb_secret_* API key (the legacy
//                            service_role key is disabled, so the
//                            platform-injected SUPABASE_SERVICE_ROLE_KEY
//                            no longer works — use a new-format secret key)

import { createClient } from "npm:@supabase/supabase-js@2";
import { createHash } from "node:crypto";

const md5Upper = (s: string) => createHash("md5").update(s).digest("hex").toUpperCase();

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const fail = (status: number, msg: string) =>
    new Response(JSON.stringify({ error: msg }), {
      status, headers: { ...cors, "Content-Type": "application/json" },
    });

  try {
    const merchantId = Deno.env.get("PAYHERE_MERCHANT_ID");
    const merchantSecret = Deno.env.get("PAYHERE_MERCHANT_SECRET");
    const secretKey = Deno.env.get("SB_SECRET_KEY");
    if (!merchantId || !merchantSecret || !secretKey) {
      return fail(500, "Payment gateway is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(supabaseUrl, secretKey);

    // Who is calling? (their session token, sent by sb.functions.invoke)
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: { user }, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !user) return fail(401, "Not signed in");

    const { order_id } = await req.json();
    if (!order_id) return fail(400, "order_id required");

    const { data: order } = await admin.from("orders")
      .select("id, order_number, customer_id, total, payment_method, payment_status, outlet_id")
      .eq("id", order_id).maybeSingle();
    if (!order) return fail(404, "Order not found");
    if (order.customer_id !== user.id) return fail(403, "Not your order");
    if (order.payment_method !== "card") return fail(400, "Not a card order");
    // 'pending' = first attempt; 'failed' = retry after a declined card.
    // 'paid'/'refunded' are terminal -- no new payment object for those.
    if (order.payment_status !== "pending" && order.payment_status !== "failed") {
      return fail(400, "Order is not awaiting payment");
    }
    if (order.payment_status === "failed") {
      // Re-arm for a fresh attempt. payhere-notify's transition guard
      // itself now accepts 'paid' from either 'pending' or 'failed' (a
      // decline-then-retry-then-approve sequence needs that), so this
      // reset isn't strictly required for correctness anymore -- but it
      // keeps the UI honest while a retry is in flight (the franchisee
      // app shows "Awaiting payment", not a stale "Failed", the moment
      // the customer starts a new attempt).
      await admin.from("orders").update({ payment_status: "pending" }).eq("id", order.id);
    }

    const { data: profile } = await admin.from("profiles")
      .select("full_name, phone").eq("id", user.id).maybeSingle();
    const { data: items } = await admin.from("order_items")
      .select("name, quantity").eq("order_id", order.id);

    // PayHere wants the amount as a plain 2-decimal string; orders.total is in cents
    const amount = (order.total / 100).toFixed(2);
    const currency = "LKR";
    const hash = md5Upper(merchantId + order.order_number + amount + currency + md5Upper(merchantSecret));

    const fullName = (profile?.full_name || "QBrew Customer").trim();
    const [firstName, ...rest] = fullName.split(/\s+/);
    const itemsLabel = (items || []).map(i => `${i.name} ×${i.quantity}`).join(", ").slice(0, 250) || "Coffee order";

    return new Response(JSON.stringify({
      sandbox: Deno.env.get("PAYHERE_SANDBOX") === "true",
      merchant_id: merchantId,
      // Popup (payhere.js) flow — onCompleted/onDismissed callbacks drive
      // the actual UI, not these redirects, but PayHere's checkout API
      // requires them to be present as real URLs regardless: `undefined`
      // vanishes when this object is serialized, so PayHere's server was
      // receiving a request with the keys missing entirely and rejecting
      // it outright (500 from sandbox.payhere.lk/pay/checkoutJ — reported
      // to the browser as a CORS failure since no headers were set on the
      // error response, masking the real cause).
      return_url: `${req.headers.get("origin") || "https://qbrew.app"}/`,
      cancel_url: `${req.headers.get("origin") || "https://qbrew.app"}/`,
      notify_url: `${supabaseUrl}/functions/v1/payhere-notify`,
      order_id: order.order_number,
      items: itemsLabel,
      amount, currency, hash,
      first_name: firstName,
      last_name: rest.join(" ") || "-",
      email: user.email || "unknown@qbrew.app",
      phone: profile?.phone || "0770000000",
      address: "Pickup order",
      city: "Colombo",
      country: "Sri Lanka",
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return fail(500, e instanceof Error ? e.message : "Unexpected error");
  }
});
