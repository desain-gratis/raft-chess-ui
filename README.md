# raft chess ui

Next.js + TypeScript + Tailwind CSS single-page-style app (client-side only pages) scaffolded for static export.

Quick start:

```bash
npm install
npm run build
npm run export
```

This produces an `out/` folder ready to be hosted anywhere as static files.

grep -rnw . -e '<secret>'  > ../aha.out to check in out/ folder wether our secret is stored as plaintext
