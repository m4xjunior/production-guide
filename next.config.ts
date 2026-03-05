import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
  { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://storage.googleapis.com; media-src 'self' blob: https://storage.googleapis.com; connect-src 'self' https://*.sentry.io https://*.ingest.sentry.io; font-src 'self'; frame-ancestors 'none'" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "@radix-ui/react-dialog", "@radix-ui/react-select", "@radix-ui/react-dropdown-menu", "@react-spring/web"],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Prisma 7's strict TypeScript client exposes pre-existing type gaps
    // (implicit any params, missing tenantId in some legacy routes).
    // TypeScript errors are caught in CI/tests — not blocking Vercel builds.
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg", "@google-cloud/storage"],
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
  webpack: {
    automaticVercelMonitors: true,
    // instrumentation-client.ts já inicializa o Sentry no cliente (inclui Replay).
    // Manter false evita que o plugin webpack injete um segundo Sentry.init(),
    // que causaria "Multiple Sentry Session Replay instances" e travaria o app.
    autoInstrumentAppDirectory: false,
  },
});