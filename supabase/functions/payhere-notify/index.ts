// ══ payhere-notify ══
//
// PayHere's server-to-server webhook. This is the ONLY trusted writer of
// a card order's payment outcome — the customer app never sets
// payment_status='paid' itself (a browser can claim anything; this
// endpoint verifies PayHere's md5sig signature, which requires the
// merchant secret to forge).
//
// verify_jwt must be OFF for this function: PayHere doesn't send a
// Supabase JWT. The md5sig check IS the authentication.
//
// Status codes (per PayHere docs): 2=success, 0=pending, -1=canceled,
// -2=failed, -3=chargedback. Only 2, -2, -3 change the order; a
// canceled/pending attempt leaves it 'pending' so the customer could
// still pay later.
//
// Required function secrets: PAYHERE_MERCHANT_ID, PAYHERE_MERCHANT_SECRET,
// SB_SECRET_KEY (see payhere-checkout/index.ts for why not service_role).

import { createClient } from "npm:@supabase/supabase-js@2";
import { createHash } from "node:crypto";

const md5Upper = (s: string) => createHash("md5").update(s).digest("hex").toUpperCase();

Deno.serve(async (req) => {
  try {
    const merchantId = Deno.env.get("PAYHERE_MERCHANT_ID");
    const merchantSecret = Deno.env.get("PAYHERE_MERCHANT_SECRET");
    const secretKey = Deno.env.get("SB_SECRET_KEY");
    if (!merchantId || !merchantSecret || !secretKey) return new Response("not configured", { status: 500 });

    const form = await req.formData();
    const f = (k: string) => (form.get(k) ?? "").toString();
    const orderNumber = f("order_id");
    const payhereAmount = f("payhere_amount");
    const statusCode = f("status_code");

    // Signature check — reject anything not provably from PayHere
    const expected = md5Upper(
      f("merchant_id") + orderNumber + payhereAmount + f("payhere_currency") + statusCode + md5Upper(merchantSecret)
    );
    if (f("merchant_id") !== merchantId || f("md5sig") !== expected) {
      return new Response("invalid signature", { status: 400 });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, secretKey);
    const { data: order } = await admin.from("orders")
      .select("id, total, payment_status")
      .eq("order_number", orderNumber).maybeSingle();
    if (!order) return new Response("unknown order", { status: 404 });

    // The signature proves PayHere sent this amount — but the amount must
    // also match what the order actually costs (guards against a tampered
    // client paying 1 rupee via a forged startPayment object).
    if (Math.abs(parseFloat(payhereAmount) - order.total / 100) > 0.01) {
      return new Response("amount mismatch", { status: 400 });
    }

    // Legal transitions only — a late/replayed webhook must not regress a
    // terminal state (e.g. a stale signed "-2" arriving after "paid" would
    // otherwise mark a successfully-charged order as failed).
    const transition =
      statusCode === "2" ? { to: "paid", from: "pending" } :
      statusCode === "-2" ? { to: "failed", from: "pending" } :
      statusCode === "-3" ? { to: "refunded", from: "paid" } : null;

    if (transition) {
      await admin.from("orders")
        .update({ payment_status: transition.to, payment_account: f("payment_id") || null })
        .eq("id", order.id)
        .eq("payment_status", transition.from);
    }

    return new Response("ok");
  } catch (e) {
    return new Response(e instanceof Error ? e.message : "error", { status: 500 });
  }
});
