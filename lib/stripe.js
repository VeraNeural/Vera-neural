const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function createCheckoutSession(email, userId, plan = 'monthly') {
  // Select price ID based on plan
  const priceId = plan === 'annual' 
    ? (process.env.STRIPE_PRICE_ID_ANNUAL || 'price_1SMtk0F8aJ0BDqA3llwpMIEf')
    : (process.env.STRIPE_PRICE_ID_MONTHLY || 'price_1SMtjQF8aJ0BDqA3wHuGgeiD');

  if (!priceId) {
    throw new Error(`Missing Stripe price ID for plan: ${plan}`);
  }
  
  console.log('Creating checkout session with priceId:', priceId, 'for plan:', plan);

  const session = await stripe.checkout.sessions.create({
    customer_email: email,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${process.env.APP_URL || 'http://localhost:3000'}/vera-pro.html?payment_success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.APP_URL || 'http://localhost:3000'}/vera-pro.html?payment_cancelled=true`,
    metadata: {
      userId: userId.toString(),
      plan: plan
    }
  });

  return session;
}

async function createBillingPortalSession(customerId) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.APP_URL}/chat.html`,
  });

  return session;
}

async function verifyWebhookSignature(payload, signature) {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );
}

module.exports = {
  createCheckoutSession,
  createBillingPortalSession,
  verifyWebhookSignature
};
