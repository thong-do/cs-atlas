# LeetHub

Learn algorithm patterns, practice them on LeetCode, and actually remember them.

- **Roadmap** of 18 patterns with mastery rings
- **Pattern pages**: how to recognize it, intuition, step-through visuals, Python templates, pitfalls, tips, and a problem ladder
- **Notes** with a required one-line insight for every solved problem
- **Spaced repetition** (FSRS) on the Today page
- **Pattern Recognition Trainer**
- Progress stays in your browser (IndexedDB) — export a backup from Settings

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # unit tests (Vitest)
npm run e2e        # end-to-end (Playwright)
npm run build      # static site in out/
```

## Add content

- Problem: add `content/problems/<slug>.yaml` (see any existing file). Write `recognitionPrompt` in your own words — never paste LeetCode’s text or a solution.
- Pattern theory: edit `content/patterns/<slug>.mdx`, set `stub: false`, and use the six H2 sections: Intuition, Visual, Template, Complexity, Pitfalls, Tips & tricks.
- The build fails with a clear message if references are broken.

## Deploy

Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`. Set `NEXT_PUBLIC_BASE_PATH` there to `/<your-repo-name>` (or remove it for a custom domain / Vercel).
