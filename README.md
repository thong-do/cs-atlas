# CS Atlas

An open, community-built place to learn computer science — algorithms, system design and more — in a way that lasts.

**Live:** https://leethub-nine.vercel.app · **Roadmap:** [docs/roadmap.md](docs/roadmap.md) · **Contribute:** [CONTRIBUTING.md](CONTRIBUTING.md)

## What's inside

- **Tracks**: Algorithms (18 lessons, 138 exercises) and System Design (growing), each with modules and a "continue" button
- **Lessons**: intuition first, step-through visualizers, templates or worked examples, pitfalls and tips
- **Exercises**: practice ladders linked to LeetCode, with notes in your own words
- **Spaced repetition** (FSRS) on the Today page, so you review just before you'd forget
- **Pattern-recognition trainer** for algorithms
- **Cross-track roadmap** with your mastery on every lesson
- Progress stays in your browser (IndexedDB); export a backup from Settings

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # content validation + unit tests (Vitest)
npm run e2e        # end-to-end (Playwright)
npm run build      # static site in out/
```

## Deploy

Hosted on Vercel: every push to `main` deploys to production, and pull requests get preview deployments. `vercel.json` redirects v1 URLs (`/patterns/*`, `/problems/*`). After a deploy, run `npm run check:deploy -- <url>` to verify the redirects and every page.

## Licence

Code: [MIT](LICENSE). Content in `content/`: [CC BY-SA 4.0](LICENSE-CONTENT).
