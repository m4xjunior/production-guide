// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // 10% sample rate for production
  tracesSampleRate: 0.1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Do NOT send PII to Sentry
  sendDefaultPii: false,
});
