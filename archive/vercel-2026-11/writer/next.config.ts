import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This app is a private, session-gated dashboard — every page is
  // inherently dynamic (auth check + live DB reads), so Cache Components'
  // default-static prerendering fights the app rather than helping it.

  // Prisma's generated client and the pg driver adapter rely on native/WASM
  // internals that Turbopack's dev bundler mishandles when pulled into the
  // worker sandbox, crashing it ("Jest worker encountered ... child process
  // exceptions"). Load these directly via Node instead of bundling them.
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg"],
  // Bundle the vendored Linux typst binary, and the local scratch-pad
  // templates, into every route's serverless output — compile.ts execs the
  // former (see TYPST_BIN), and the Templates page reads the latter from
  // disk at request time.
  outputFileTracingIncludes: {
    "/**": ["./vendor/typst/typst-linux-x64", "./templates/**"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
