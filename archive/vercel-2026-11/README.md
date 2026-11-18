# Retired Vercel apps (November 2026)

Reference copy of the two apps that ran on Vercel before MachNotes moved to
GitHub Pages. Pulled from the deployments' source; secrets (.env), lockfiles,
build output and the bundled Typst binary were left out.

- `public-site/`: Nuxt 4 + Nuxt UI public site (machnotes.vercel.app), read
  articles from Neon Postgres via Prisma.
- `writer/`: Next.js writer app (machnotes-writer.vercel.app) with Neon Auth,
  a Typst editor and compile pipeline, media/resource storage.

Not built or deployed. The topic taxonomy now lives in /categories.json and
the topic map was ported to /assets/map.js.
