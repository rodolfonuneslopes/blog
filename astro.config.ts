import {
  defineConfig,
  envField,
  fontProviders,
  svgoOptimizer,
} from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";
import { unified } from "@astrojs/markdown-remark";
import remarkToc from "remark-toc";
import remarkCollapse from "remark-collapse";
import rehypeCallouts from "rehype-callouts";
import rehypeMermaid, { type RehypeMermaidOptions } from "rehype-mermaid";
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from "@shikijs/transformers";
import { transformerFileName } from "./src/utils/transformers/fileName";
import config from "./astro-paper.config";

// Diagrams are rendered to SVG at build time; a broken diagram (e.g. from an
// automated Obsidian sync) falls back to its code block instead of failing
// the deploy.
const mermaidOptions: RehypeMermaidOptions = {
  strategy: "inline-svg",
  errorFallback: (element, _diagram, error, file) => {
    // eslint-disable-next-line no-console
    console.error(`Failed to render Mermaid diagram in ${file.path}:`, error);
    return element;
  },
};

export default defineConfig({
  site: config.site.url,
  adapter: vercel({
    webAnalytics: { enabled: true },
  }),
  integrations: [
    // MDX does not inherit plugins from the custom `unified()` processor
    // below, so rehype-mermaid is passed explicitly here too.
    mdx({ rehypePlugins: [[rehypeMermaid, mermaidOptions]] }),
    sitemap({
      filter: page =>
        config.features?.showArchives !== false || !page.endsWith("/archives/"),
    }),
  ],
  i18n: {
    locales: ["en"],
    defaultLocale: "en",
    routing: {
      prefixDefaultLocale: false,
    },
  },
  markdown: {
    processor: unified({
      remarkPlugins: [
        remarkToc,
        [remarkCollapse, { test: "Table of contents" }],
      ],
      rehypePlugins: [rehypeCallouts, [rehypeMermaid, mermaidOptions]],
    }),
    // Leave mermaid blocks unhighlighted so rehype-mermaid can render them.
    syntaxHighlight: { type: "shiki", excludeLangs: ["mermaid"] },
    shikiConfig: {
      themes: { light: "min-light", dark: "night-owl" },
      defaultColor: false,
      wrap: false,
      transformers: [
        transformerFileName({ style: "v2", hideDot: false }),
        transformerNotationHighlight(),
        transformerNotationWordHighlight(),
        transformerNotationDiff({ matchAlgorithm: "v3" }),
      ],
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
  fonts: [
    {
      name: "Google Sans Code",
      cssVariable: "--font-google-sans-code",
      provider: fontProviders.google(),
      fallbacks: ["monospace"],
      weights: [300, 400, 500, 600, 700],
      styles: ["normal", "italic"],
      formats: ["woff", "ttf"],
    },
  ],
  env: {
    schema: {
      PUBLIC_GOOGLE_SITE_VERIFICATION: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
    },
  },
  experimental: {
    svgOptimizer: svgoOptimizer(),
  },
});
