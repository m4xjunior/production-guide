import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default withSentryConfig(nextConfig, {
  org: "lexusfx",
  project: "pic-to-voice",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  webpack: {
    automaticVercelMonitors: true,
    autoInstrumentServerFunctions: false,
    autoInstrumentAppDirectory: false,
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
