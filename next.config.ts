import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        module: false,
        path: false,
        os: false,
        crypto: false, "node:crypto": false,
      };
    }
    return config;
  },
};

export default withSentryConfig(nextConfig, {
  org: "lexusfx",
  project: "pic-to-voice",
  silent: !process.env.CI,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  automaticVercelMonitors: true,
  // instrumentation-client.ts já inicializa o Sentry no cliente (inclui Replay).
  // Manter false evita que o plugin webpack injete um segundo Sentry.init(),
  // que causaria "Multiple Sentry Session Replay instances" e travaria o app.
  autoInstrumentAppDirectory: false,
});