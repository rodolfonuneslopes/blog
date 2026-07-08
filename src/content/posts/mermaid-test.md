---
title: Mermaid rendering test
pubDatetime: 2026-07-08T12:00:00Z
draft: false
tags:
  - test
description: Temporary post to verify build-time Mermaid diagram rendering.
---

A flowchart:

```mermaid
graph TD
  A[Write post in Obsidian] --> B{Has Mermaid blocks?}
  B -->|Yes| C[rehype-mermaid renders SVG at build time]
  B -->|No| D[Shiki highlights code as usual]
  C --> E[Static page, no client JS]
  D --> E
```

A sequence diagram:

```mermaid
sequenceDiagram
  participant O as Obsidian
  participant G as GitHub
  participant V as Vercel
  O->>G: Sync notes (git push)
  G->>V: Trigger build
  V->>V: Render Mermaid to SVG
  V-->>O: Deployed post with diagrams
```

A normal code block, to confirm Shiki still highlights everything else:

```ts
export function greet(name: string): string {
  return `Hello, ${name}!`;
}
```
