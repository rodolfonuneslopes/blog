---
title: "About"
description: "How this blog was implemented."
---
This page details the technologies used to build and deploy this [blog](https://github.com/rodolfonuneslopes/blog), as well as its main features. If you're interested in knowing more about its contents and philosophy, please check the [home page](https://blog.nuneslopes.org).
## Tech Stack
This project was developed with [Astro](https://astro.build/), a JavaScript framework for building content-driven websites such as this blog. Alongside, I've used a couple of other accessory technologies:
- [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss) 
- [Pagefind](https://github.com/Pagefind/pagefind) 
- [Satori](https://github.com/vercel/satori) +[Sharp](https://github.com/lovell/sharp)
- Official Astro integrations:[@astrojs/mdx](https://docs.astro.build/en/guides/integrations-guide/mdx/) and [@astrojs/sitemap](https://docs.astro.build/en/guides/integrations-guide/sitemap/)
### Appearence
I used the theme [AstroPaper](https://github.com/satnaing/astro-paper) by [Sat Naing](https://github.com/satnaing), which I then rebranded to my own taste and needs. 
## Main features
- Full-text search
- RSS feed and sitemap
- Light and dark mode
- MDX support for posts with embedded components
## Deployment
I've deployed it on [Vercel](https://vercel.com/), instead of self-hosting it, because I wanted to assure a theoretical 100% uptime. Vercel's integration of Astro is seamless, and you can also get great free features such as Web Analytics, performance enhancements etc.
## Writing and publishing
I've set up a pipeline that allows me to simply write (or edit) notes in Obsidian that are automatically published in the blog, when I set `draft: false` in the Markdown file's frontmatter. If I want to unpublish a post, I only need to set `draft: true`. Everything happens inside Obsidian.

If you're curious about the pipeline, check out this [post](https://blog.nuneslopes/posts/productivity/from-obsidian-to-blog/), where I explain everything in detail. 