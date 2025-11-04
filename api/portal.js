const { createBillingPortalSession, createCheckoutSession } = require('../lib/stripe');
const { getUserByEmail } = require('../lib/database');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const user = await getUserByEmail(email);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If user has a stripe_customer_id, they have an active subscription - show billing portal
    if (user.stripe_customer_id) {
      console.log('📊 [PORTAL] User has subscription, opening billing portal');
      const session = await createBillingPortalSession(user.stripe_customer_id);
      return res.status(200).json({ 
        url: session.url
      });
    }

    // If no stripe_customer_id, they're still on trial - redirect to upgrade/checkout
    console.log('🆓 [PORTAL] User on trial, redirecting to checkout to upgrade');
    const checkoutSession = await createCheckoutSession(email, user.id);
    return res.status(200).json({
      url: checkoutSession.url
    });

  } catch (error) {
    console.error('Portal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

```
