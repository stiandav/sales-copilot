// ============================================================
// STRIPE WEBHOOK — Supabase Edge Function
// ============================================================
// Deploy as a Supabase Edge Function:
//   1. Install Supabase CLI: npm i -g supabase
//   2. supabase functions new stripe-webhook
//   3. Copy this code into supabase/functions/stripe-webhook/index.ts
//   4. Set secrets:
//      supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
//      supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
//   5. Deploy: supabase functions deploy stripe-webhook
//   6. In Stripe Dashboard > Webhooks > Add endpoint:
//      URL: https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook
//      Events: checkout.session.completed, customer.subscription.updated,
//              customer.subscription.deleted, invoice.payment_failed
// ============================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@13?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2023-10-16',
});

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

const supabase = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
);

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  switch (event.type) {
    // ---- Checkout completed — new subscription ----
    case 'checkout.session.completed': {
      const session = event.data.object;
      const email = session.customer_email || session.customer_details?.email;
      const customerId = session.customer;
      const subscriptionId = session.subscription;

      if (email && subscriptionId) {
        // Get subscription details from Stripe
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const plan = sub.items.data[0]?.price?.recurring?.interval === 'year' ? 'annual' : 'monthly';

        // Find user by email
        const { data: users } = await supabase.auth.admin.listUsers();
        const user = users?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

        if (user) {
          await supabase.from('subscriptions').upsert({
            user_id: user.id,
            email: email.toLowerCase(),
            plan: plan,
            status: 'active',
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
        }
      }
      break;
    }

    // ---- Subscription updated (renewal, plan change) ----
    case 'customer.subscription.updated': {
      const sub = event.data.object;
      const { data: rows } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('stripe_subscription_id', sub.id)
        .limit(1);

      if (rows && rows.length > 0) {
        const plan = sub.items.data[0]?.price?.recurring?.interval === 'year' ? 'annual' : 'monthly';
        await supabase.from('subscriptions').update({
          status: sub.status === 'active' ? 'active' : sub.status === 'past_due' ? 'past_due' : 'canceled',
          plan: plan,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('stripe_subscription_id', sub.id);
      }
      break;
    }

    // ---- Subscription canceled ----
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      await supabase.from('subscriptions').update({
        status: 'canceled',
        updated_at: new Date().toISOString(),
      }).eq('stripe_subscription_id', sub.id);
      break;
    }

    // ---- Payment failed ----
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      if (invoice.subscription) {
        await supabase.from('subscriptions').update({
          status: 'past_due',
          updated_at: new Date().toISOString(),
        }).eq('stripe_subscription_id', invoice.subscription);
      }
      break;
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
