const { verifyWebhookSignature } = require('../lib/stripe');
const { getUserById, updateUserSubscription } = require('../lib/database');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const signature = req.headers['stripe-signature'];
    const payload = req.body;

    const event = verifyWebhookSignature(payload, signature);

    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        const userId = session.metadata.userId;
        const user = await getUserById(userId);
        
        if (user) {
          await updateUserSubscription(user.email, 'active', session.customer);
        }
        break;

      case 'customer.subscription.updated':
        const subscription = event.data.object;
        const customerId = subscription.customer;
        
        if (subscription.status === 'active') {
          await updateUserSubscription(customerId, 'active', customerId);
        } else if (subscription.status === 'canceled' || subscription.status === 'past_due') {
          await updateUserSubscription(customerId, 'inactive', customerId);
        }
        break;

      case 'customer.subscription.deleted':
        const deletedSub = event.data.object;
        await updateUserSubscription(deletedSub.customer, 'inactive', deletedSub.customer);
        break;
    }

    res.status(200).json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook error' });
  }
};
