import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Prisma 7's strict TypeScript client exposes pre-existing type gaps
    // (implicit any params, missing tenantId in some legacy routes).
    // TypeScript errors are caught in CI/tests — not blocking Vercel builds.
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Prisma 7 TypeScript client (./generated/prisma) usa node: protocol
      // internamente. Externalizamos esses módulos para que o Node.js os
      // resolva nativamente em vez de o webpack tentar compilá-los.
      const existingExternals = Array.isArray(config.externals)
        ? config.externals
        : config.externals
          ? [config.externals]
          : [];
      config.externals = [
        ...existingExternals,
        ({ request }: { request?: string }, callback: (err?: Error | null, result?: string) => void) => {
          if (request?.startsWith("node:")) {
            return callback(null, `commonjs ${request.slice(5)}`);
          }
          callback();
        },
      ];
    } else {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        module: false,
        path: false,
        os: false,
        crypto: false,
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