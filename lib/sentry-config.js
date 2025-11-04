/**
 * Sentry Error Tracking Configuration
 * Captures API errors, client-side exceptions, and payment issues
 */

const Sentry = require('@sentry/node');

// Initialize Sentry only if DSN is provided
const initSentry = () => {
  if (!process.env.SENTRY_DSN) {
    console.log('⚠️  Sentry DSN not configured - error tracking disabled');
    return null;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'production',
    tracesSampleRate: 1.0,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.OnUncaughtException(),
      new Sentry.Integrations.OnUnhandledRejection(),
    ],
  });

  console.log('✅ Sentry initialized for error tracking');
  return Sentry;
};

// Express middleware for Sentry request tracking
const sentryRequestMiddleware = Sentry.Handlers.requestHandler();
const sentryErrorMiddleware = Sentry.Handlers.errorHandler();

/**
 * Capture API errors with context
 */
const captureApiError = (error, context = {}) => {
  if (!process.env.SENTRY_DSN) return;

  Sentry.captureException(error, {
    tags: {
      type: 'api_error',
      ...context.tags,
    },
    extra: {
      endpoint: context.endpoint,
      method: context.method,
      statusCode: context.statusCode,
      ...context.extra,
    },
  });

  console.error(`❌ API Error captured in Sentry: ${error.message}`);
};

/**
 * Capture payment errors specifically
 */
const capturePaymentError = (error, paymentContext = {}) => {
  if (!process.env.SENTRY_DSN) return;

  Sentry.captureException(error, {
    tags: {
      type: 'payment_error',
      service: paymentContext.service || 'stripe',
    },
    extra: {
      email: paymentContext.email,
      priceId: paymentContext.priceId,
      customerId: paymentContext.customerId,
      amount: paymentContext.amount,
      currency: paymentContext.currency,
      errorCode: paymentContext.errorCode,
    },
  });

  console.error(`❌ Payment Error captured: ${error.message}`);
};

/**
 * Capture authentication errors
 */
const captureAuthError = (error, authContext = {}) => {
  if (!process.env.SENTRY_DSN) return;

  Sentry.captureException(error, {
    tags: {
      type: 'auth_error',
    },
    extra: {
      email: authContext.email,
      action: authContext.action, // e.g., 'send_magic_link', 'verify_token'
      ip: authContext.ip,
      userAgent: authContext.userAgent,
    },
  });

  console.error(`❌ Auth Error captured: ${error.message}`);
};

/**
 * Capture rate limit violations
 */
const captureRateLimit = (context = {}) => {
  if (!process.env.SENTRY_DSN) return;

  Sentry.captureMessage('Rate limit exceeded', 'warning', {
    tags: {
      type: 'rate_limit',
      limitType: context.limitType, // 'ip' or 'email'
    },
    extra: {
      ip: context.ip,
      email: context.email,
      requestsCount: context.requestsCount,
      limit: context.limit,
      windowSeconds: context.windowSeconds,
    },
  });

  console.warn(`⚠️  Rate limit violation captured: ${context.limitType}`);
};

/**
 * Manual message capture for monitoring
 */
const captureMessage = (message, level = 'info', context = {}) => {
  if (!process.env.SENTRY_DSN) return;

  Sentry.captureMessage(message, level, {
    extra: context,
  });
};

/**
 * Set user context for error tracking
 */
const setUserContext = (email) => {
  if (!process.env.SENTRY_DSN) return;

  Sentry.setUser({
    email: email,
  });
};

/**
 * Clear user context
 */
const clearUserContext = () => {
  if (!process.env.SENTRY_DSN) return;

  Sentry.setUser(null);
};

module.exports = {
  initSentry,
  Sentry,
  sentryRequestMiddleware,
  sentryErrorMiddleware,
  captureApiError,
  capturePaymentError,
  captureAuthError,
  captureRateLimit,
  captureMessage,
  setUserContext,
  clearUserContext,
};
