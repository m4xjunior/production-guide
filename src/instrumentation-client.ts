// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Add optional integrations for additional features
  integrations: [Sentry.replayIntegration()],

  // 10% sample rate for production
  tracesSampleRate: 0.1,
  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Define how likely Replay events are sampled.
  replaysSessionSampleRate: 0.1,

  // Define how likely Replay events are sampled when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  // Do NOT send PII (cookies, headers, operatorNumber) to Sentry
  sendDefaultPii: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
