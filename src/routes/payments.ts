import { Router, type Request, type Response } from 'express';
import Stripe from 'stripe';
import { StripeUpgradeService, type UpgradeTier } from '../services/payments/StripeUpgradeService';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY is required to initialize Stripe.');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-11-20',
});

const paymentsRouter = Router();

const getFrontendUrl = () => process.env.FRONTEND_URL || 'http://localhost:8080';
const getBackendUrl = () => process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;

paymentsRouter.post('/upgrade-checkout', async (req: Request, res: Response) => {
  try {
    const { tier, companyId, customerEmail } = req.body as {
      tier?: string;
      companyId?: string;
      customerEmail?: string;
    };

    if (!companyId) {
      return res.status(400).json({ success: false, error: 'companyId is required' });
    }

    if (!StripeUpgradeService.isValidTier(tier)) {
      return res.status(400).json({ success: false, error: 'Invalid tier' });
    }

    const { amount, currency, label } = StripeUpgradeService.getPrice(tier);

    const frontendUrl = getFrontendUrl();
    const backendUrl = getBackendUrl();

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: customerEmail,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: amount * 100,
            product_data: {
              name: `HRM8 - ${label}`,
            },
          },
        },
      ],
      success_url: `${frontendUrl}/upgrade-success?tier=${tier}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/upgrade-cancelled?tier=${tier}`,
      metadata: {
        companyId,
        tier,
        app: 'hrm8',
      },
      payment_intent_data: {
        metadata: {
          companyId,
          tier,
          app: 'hrm8',
        },
      },
    });

    return res.status(200).json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
      backendUrl,
    });
  } catch (error) {
    console.error('Error creating checkout session', error);
    return res.status(500).json({ success: false, error: 'Failed to create checkout session' });
  }
});

export const stripeWebhookHandler = async (req: Request, res: Response) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers['stripe-signature'];

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).send('Webhook secret not configured');
  }

  if (!signature) {
    return res.status(400).send('Missing Stripe signature header');
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, signature as string, webhookSecret);
  } catch (err: any) {
    console.error('Stripe webhook signature verification failed', err?.message);
    return res.status(400).send(`Webhook Error: ${err?.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const tier = session.metadata?.tier as UpgradeTier | undefined;
      const companyId = session.metadata?.companyId;

      if (session.payment_status === 'paid' && companyId && StripeUpgradeService.isValidTier(tier)) {
        await StripeUpgradeService.recordSuccessfulUpgrade({
          companyId,
          tier,
          amount: session.amount_total,
          currency: session.currency,
          stripeSessionId: session.id,
        });
      } else {
        console.warn('Checkout session missing required metadata', {
          companyId,
          tier,
          payment_status: session.payment_status,
        });
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error handling Stripe webhook', error);
    res.status(500).send('Webhook handler error');
  }
};

export default paymentsRouter;


