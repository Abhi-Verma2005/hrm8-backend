import { Router, type Request, type Response, type Router as RouterType } from 'express';
import Stripe from 'stripe';
import { StripeUpgradeService, type UpgradeTier } from '../services/payments/StripeUpgradeService';
import { JobPaymentService } from '../services/payments/JobPaymentService';
import { prisma } from '../lib/prisma';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY is required to initialize Stripe.');
}

const stripe = new Stripe(stripeSecretKey);

const paymentsRouter: RouterType = Router();

const getFrontendUrl = () => process.env.FRONTEND_URL || 'http://localhost:8080';
const getBackendUrl = () => process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;

paymentsRouter.post('/job-checkout', async (req: Request, res: Response) => {
  try {
    const { jobId, servicePackage, companyId, customerEmail } = req.body as {
      jobId?: string;
      servicePackage?: string;
      companyId?: string;
      customerEmail?: string;
    };

    if (!jobId) {
      return res.status(400).json({ success: false, error: 'jobId is required' });
    }

    if (!servicePackage) {
      return res.status(400).json({ success: false, error: 'servicePackage is required' });
    }

    if (!companyId) {
      return res.status(400).json({ success: false, error: 'companyId is required' });
    }

    const validPackages: string[] = ['self-managed', 'shortlisting', 'full-service', 'executive-search'];
    if (!validPackages.includes(servicePackage)) {
      return res.status(400).json({ success: false, error: 'Invalid servicePackage' });
    }

    const result = await JobPaymentService.createJobCheckoutSession({
      jobId,
      servicePackage: servicePackage as any,
      companyId,
      customerEmail,
    });

    return res.status(200).json({
      success: true,
      data: {
        checkoutUrl: result.checkoutUrl,
        sessionId: result.sessionId,
      },
    });
  } catch (error: any) {
    console.error('❌ Error creating job checkout session:', {
      message: error?.message,
      stack: error?.stack,
      type: error?.type,
      code: error?.code,
    });
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create checkout session',
    });
  }
});

// Verify job payment after redirect from Stripe (for local dev where webhooks don't work)
paymentsRouter.post('/verify-job-payment', async (req: Request, res: Response) => {
  try {
    const { jobId, companyId } = req.body as {
      jobId?: string;
      companyId?: string;
    };

    if (!jobId) {
      return res.status(400).json({ success: false, error: 'jobId is required' });
    }

    if (!companyId) {
      return res.status(400).json({ success: false, error: 'companyId is required' });
    }

    // Find job and get stripe session ID
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        company_id: true,
        stripe_session_id: true,
        payment_status: true,
        service_package: true,
        status: true,
      },
    });

    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    if (job.company_id !== companyId) {
      return res.status(403).json({ success: false, error: 'Job does not belong to this company' });
    }

    // Already paid
    if (job.payment_status === 'PAID') {
      return res.status(200).json({
        success: true,
        data: { paymentStatus: 'PAID', alreadyPaid: true },
      });
    }

    // No stripe session to verify
    if (!job.stripe_session_id) {
      return res.status(400).json({ success: false, error: 'No payment session found for this job' });
    }

    // Retrieve session from Stripe
    const session = await stripe.checkout.sessions.retrieve(job.stripe_session_id);



    if (session.payment_status === 'paid') {
      const paymentIntentId = typeof session.payment_intent === 'string'
        ? session.payment_intent
        : (session.payment_intent as any)?.id;

      const paymentAmount = (session.amount_total || 0) / 100;

      // Update job payment status
      await prisma.job.update({
        where: { id: jobId },
        data: {
          payment_status: 'PAID',
          stripe_payment_intent_id: paymentIntentId || undefined,
          payment_completed_at: new Date(),
          payment_failed_at: null,
        },
      });

      // Auto-publish the job
      const { JobService } = await import('../services/job/JobService');
      try {
        await JobService.publishJob(jobId, companyId);

      } catch (publishError: any) {

      }

      // Create commissions (same as webhook handler)
      // 1. Commission for assigned consultant
      try {
        const { CommissionService } = await import('../services/hrm8/CommissionService');
        const jobDetails = await prisma.job.findUnique({
          where: { id: jobId },
          select: {
            id: true,
            region_id: true,
            hiring_mode: true,
            service_package: true,
            consultant_assignments: {
              select: { consultant_id: true },
              take: 1,
            },
          },
        });

        if (jobDetails?.consultant_assignments?.[0]?.consultant_id && jobDetails.region_id) {
          const commissionResult = await CommissionService.createCommissionForJobAssignment(
            jobId,
            jobDetails.consultant_assignments[0].consultant_id,
            jobDetails.region_id,
            paymentAmount
          );
          if (commissionResult.success) {

          } else {

          }
        }
      } catch (commissionError: any) {

      }

      // 2. Commission for sales agent who acquired the company (Using new centralized logic)
      try {
        const { CommissionService } = await import('../services/hrm8/CommissionService');
        const paymentAmount = (session.amount_total || 0) / 100;

        await CommissionService.processSalesCommission(
          companyId,
          paymentAmount,
          `Sales commission for ${job.service_package} service - $${paymentAmount}`,
          jobId,
          undefined,
          'JOB_PAYMENT'
        );
      } catch (salesError: any) {

      }

      return res.status(200).json({
        success: true,
        data: { paymentStatus: 'PAID', verified: true, published: true },
      });
    } else if (session.status === 'expired') {
      return res.status(200).json({
        success: true,
        data: { paymentStatus: 'EXPIRED', verified: true },
      });
    } else {
      return res.status(200).json({
        success: true,
        data: { paymentStatus: session.payment_status?.toUpperCase() || 'PENDING', verified: true },
      });
    }
  } catch (error) {
    console.error('Error verifying job payment', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to verify payment',
    });
  }
});

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

export const stripeWebhookHandler = async (req: Request, res: Response): Promise<void> => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers['stripe-signature'];

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    res.status(500).send('Webhook secret not configured');
    return;
  }

  if (!signature) {
    res.status(400).send('Missing Stripe signature header');
    return;
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, signature as string, webhookSecret);
  } catch (err: any) {
    console.error('Stripe webhook signature verification failed', err?.message);
    res.status(400).send(`Webhook Error: ${err?.message}`);
    return;
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata || {};
      const paymentType = metadata.type;

      // Handle job-specific payments
      if (paymentType === 'job_payment') {
        const jobId = metadata.jobId;
        const companyId = metadata.companyId;
        const servicePackage = metadata.servicePackage || 'shortlisting';

        if (session.payment_status === 'paid' && jobId && companyId) {
          // Get payment intent ID if available
          const paymentIntentId = typeof session.payment_intent === 'string'
            ? session.payment_intent
            : (session.payment_intent as any)?.id;

          try {
            // 1. Record the payment
            await JobPaymentService.recordJobPayment({
              jobId,
              stripeSessionId: session.id,
              stripePaymentIntentId: paymentIntentId,
              amount: (session.amount_total || 0) / 100, // Convert from cents
              currency: session.currency || 'usd',
            });

            // 2. Double check and ensure job has correct service package and payment status in DB
            // This ensures the job is ready for publishing regardless of initial state
            await prisma.job.update({
              where: { id: jobId },
              data: {
                payment_status: 'PAID',
                service_package: servicePackage,
              }
            });

            // 3. Auto-publish the job after successful payment
            const { JobService } = await import('../services/job/JobService');
            try {
              await JobService.publishJob(jobId, companyId);
            } catch (publishError: any) {
              // If already published or other non-fatal error, just log it

            }

            // 4. Create commission for assigned consultant (if any)
            try {
              const { CommissionService } = await import('../services/hrm8/CommissionService');
              const job = await prisma.job.findUnique({
                where: { id: jobId },
                select: {
                  id: true,
                  region_id: true,
                  hiring_mode: true,
                  consultant_assignments: {
                    select: { consultant_id: true },
                    take: 1,
                  },
                },
              });

              if (job?.consultant_assignments?.[0]?.consultant_id && job.region_id) {
                const commissionResult = await CommissionService.createCommissionForJobAssignment(
                  jobId,
                  job.consultant_assignments[0].consultant_id,
                  job.region_id,
                  (session.amount_total || 0) / 100 // Service fee amount
                );
                if (commissionResult.success) {

                } else {

                }
              }
            } catch (commissionError: any) {
              // Non-fatal - log but don't fail payment processing

            }

            // 5. Create commission for sales agent who acquired this company (Using centralized logic)
            try {
              const { CommissionService } = await import('../services/hrm8/CommissionService');
              const paymentAmount = (session.amount_total || 0) / 100;

              await CommissionService.processSalesCommission(
                companyId,
                paymentAmount,
                `Sales commission for ${servicePackage} service payment - $${paymentAmount}`,
                jobId,
                undefined,
                'JOB_PAYMENT'
              );
            } catch (salesError: any) {
              // Non-fatal - log but don't fail payment processing

            }
          } catch (error) {
            console.error(`❌ Error processing payment for job ${jobId}:`, error);
          }
        } else {
          console.warn('Job payment checkout session missing required metadata or not paid', {
            jobId,
            companyId,
            payment_status: session.payment_status,
          });
        }
      }
      // Handle company-level upgrades (legacy)
      else {
        const tier = metadata.tier as UpgradeTier | undefined;
        const companyId = metadata.companyId;

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
    }

    // Handle payment failures
    if (event.type === 'checkout.session.async_payment_failed' || event.type === 'payment_intent.payment_failed') {
      const session = event.data.object as Stripe.Checkout.Session | Stripe.PaymentIntent;
      const metadata = (session as any).metadata || {};
      const paymentType = metadata.type;

      if (paymentType === 'job_payment' && metadata.jobId) {
        await JobPaymentService.recordJobPaymentFailure(metadata.jobId);
      }
    }

    // Handle Stripe Connect events (transfers)
    const eventType = event.type as string;
    if (eventType === 'transfer.paid' || eventType === 'transfer.failed') {
      try {
        const { StripePayoutService } = await import('../services/sales/StripePayoutService');
        await StripePayoutService.handleWebhook(event);
      } catch (error) {
        console.error('Error handling Stripe Connect webhook:', error);
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error handling Stripe webhook', error);
    res.status(500).send('Webhook handler error');
  }
};

export default paymentsRouter;











