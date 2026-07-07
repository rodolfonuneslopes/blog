# blog.nuneslopes

My personal blog, built with [Astro](https://astro.build/) on the [AstroPaper](https://github.com/satnaing/astro-paper) theme.

## Commands

All commands are run from the root of the project, from a terminal:

| Command          | Action                                                                                            |
| :--------------- | :-------------------------------------------------------------------------------------------------- |
| `pnpm install`   | Installs dependencies                                                                              |
| `pnpm dev`       | Starts local dev server at `localhost:4321`                                                        |
| `pnpm build`     | Type-checks, builds the site, runs Pagefind indexing, and copies the index to `public/pagefind/`   |
| `pnpm preview`   | Preview the build locally, before deploying                                                        |
| `pnpm sync`      | Generates TypeScript types for all Astro modules                                                   |
| `pnpm astro ...` | Run CLI commands like `astro add`, `astro check`                                                   |

Blog posts live in `src/content/posts/`. Site-wide configuration (title, socials, features) is in `astro-paper.config.ts`.

## License

Licensed under the MIT License — see [LICENSE](LICENSE). Based on the AstroPaper theme, Copyright © Sat Naing.
