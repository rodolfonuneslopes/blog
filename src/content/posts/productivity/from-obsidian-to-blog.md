---
title: Write in Obsidian, publish anywhere (automatically)
author: rodolfonuneslopes
pubDatetime: 2026-07-10T05:13:19Z
featured: true
draft: false
tags:
  - productivity
description: A pipeline to create notes in Obsidian and automatically publish them as posts in a blog
---
When I created this blog, I really had no idea how was I going to feed it with posts; since it has no WYSIWYG interface or anything like that. In fact, I already knew that uploading Markdown files to `src/content/posts` was a good approach, but it would be insane to perform a whole git flow each time I wanted to post something.

Since necessity is the mother of invention, I came up with the laziest solution possible: I write a post in Obsidian, press a button (still in Obsidian), and the post is published in the blog. Simple as that. This post explains how to implement this pipeline, step by step.
## 1 Requirements
- Obsidian vault with the [GitHub Sync plugin](https://community.obsidian.md/plugins/github-sync)
	- Actually, this works with any Markdown editor, as long as you drive git separately
- `git` and a GitHub account
- A destination path inside a git repo to send the files. Mine is `src/content/posts`, because that's [Astro's](https://astro.build) implementation of the posts directory. This works with any destination path, as long as it is inside a GitHub repo.
## 2 Description of the pipeline
The workflow is actually very simple:
1. The file frontmatter has a property `draft` that works as key for the whole process. The trigger is to set `draft: false` and save the file
2. GitHub Sync plugin pushes the changes to `blog-posts` repo
3. The push triggers a GitAction to filter notes by the property `draft`, so that
	1. notes with `draft: true` are skipped
	2. notes with `draft: false` are pushed to the `blog` repo
4. Vercel's Git integration (in the `blog` repo) triggers a new build
5. Notes are published in the blog

```
Obsidian Vault
    │  (force save + Git Sync)
    ▼
GitHub Sync plugin ──git push──▶ blog-posts repo
                                     │
                                     │ triggers on push to main
                                     ▼
                              GitHub Action
                                     │
                          ┌──────────┴──────────┐
                          │   draft: false ?     │
                          └──────────┬──────────┘
                        yes │                │ no
                            ▼                ▼
                    copy to filtered/     skipped
                            │
                            │ rsync --delete
                            ▼
                    blog repo (src/content/posts)
                            │
                            │ git commit + push
                            ▼
                      Deploy trigger
                            │
                            ▼
                        Update Blog
```
## 3 Set up Obsidian
### 3.1 Create a new vault
The first step is to create a new vault somewhere in your filesystem. Personally, I've created it inside my `git` directory (where I save all my repos), because, after all, this vault is going to be a git repo.
### 3.2 Create a template
Like I've just said, the key for the whole process is the property `draft` that triggers the pipeline when set to `false` and also determines the note filtering by the GitAction. So, this property must be in the frontmatter of the Markdown file, and the frontmatter **must be at the very beginning of the file**.

The best way to handle this requirement is to create a template (and Obsidian has a [core plugin for templates](https://obsidian.md/help/plugins/templates)) with a boilerplate frontmatter and, then, use the template for every new note. In my case, since I'm using Astro, there are a couple of other properties that I must include. Here's the frontmatter of this post:
```
---
title: Write in Obsidian, publish anywhere (automatically)
author: rodolfonuneslopes
pubDatetime: 2026-07-07T05:17:19Z
featured: true
draft: true
tags:
  - productivity
description: A pipeline to create notes in Obsidian and automatically publish them as posts in a blog
---
```

**IMPORTANT**: remember to leave `draft: true` until you're ready to publish the note as a blog post. If you change it to `false` and GitHub Sync is set to perform automatic syncs, the note will be automatically published.
### 3.3 The GitHub Sync plugin
Since there's nothing to sync yet, and you still have to configure the repos in GitHub, let's postpone the plugin installation to the end of this post.  
## 4 Create the `blog-posts` repo
This is the repository that Obsidian pushes the notes to. It must be initialized inside the Obsidian vault, so that the GitHub Sync plugin can do its job. You can either create it locally with `git init` or do it in GitHub and then clone it, as long as you do it **inside the Obsidian vault**.
### 4.1 Add the workflow file
This is the file that will be used by GitActions to filter the notes and push the new ones to the `blog` repo. You can choose whatever name you want, but **it must be a YML file inside `.github/workflows/`**. Here's my file (`.github/workflows/sync-to-astro.yml`):
```yml
name: Sync notes to Astro blog

on:
  push:
    branches: [main]

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout notes repo
        uses: actions/checkout@v4
        with:
          path: notes

      - name: Checkout astro repo
        uses: actions/checkout@v4
        with:
          repository: rodolfonuneslopes/blog 
          token: ${{ secrets.ASTRO_REPO_TOKEN }}
          path: astro

      - name: "Filter notes with draft: false"
        run: |
          mkdir -p filtered
          find notes -name '*.md' | while read -r file; do
            frontmatter=$(awk '/^---$/{c++; next} c==1' "$file")
            if echo "$frontmatter" | grep -qE '^draft:[[:space:]]*("?false"?)[[:space:]]*$'; then
              rel="${file#notes/}"
              mkdir -p "filtered/$(dirname "$rel")"
              cp "$file" "filtered/$rel"
            fi
          done

      - name: "Copy filtered markdown files"
        run: |
          rsync -a --delete --include='*/' --include='*.md' --exclude='*' filtered/ astro/src/content/posts/

      - name: Commit and push
        run: |
          cd astro
          git config user.name "notes-sync-bot"
          git config user.email "actions@users.noreply.github.com"
          git add src/content/posts/
          git diff --staged --quiet || git commit -m "Sync notes from Obsidian"
          git push
```
- In `repository:` replace `rodolfonuneslopes/blog` with your repo path
- If you compare this with [my real file](https://github.com/rodolfonuneslopes/blog-posts/blob/main/.github/workflows/sync-to-astro.yml), you can see an extra `job` that validates required frontmatter fields; so that files with invalid frontmatter don't get pushed to the blog. This snippet doesn't include that validation, because you can have a completely different frontmatter. 
## 5 Secure cross-repo communication
Even if you're the owner of both repos, it's really important to authorize the GitAction in the `blog-posts` repo that pushes files to the `blog` repo. And, like in every authorization mechanism, the golden rule is the Principle of Least Privilege: "users, applications, and systems should be granted only the minimum permissions necessary to perform their required tasks." This means that the GitAction will have permission to push files to that specific repo, and nothing else.
### 5.1 Create an access token
To limit the access to one single repo, you'll need a **fine-grained Personal Access Token (PAT)**. If you use a classic token, it would authorize that GitAction to access all your repos. And you don't want that.

To generate the token in GitHub, navigate to **Settings > Developer settings > Personal access tokens > Fine-grained tokens**. Click **Generate New Token** and fill in the form:
- Token name: whatever you wish (e.g. `push-notes-to-blog-repo`)
- Expiration: 1 year is good
- Resource owner: your account
- Repository access: Only select repositories > select the `blog-posts` repo
- Permissions: Add permissions > Contents > Access: Read and Write

**IMPORTANT**: GitHub will show you the token **only once**. If you close the tab, you won't see the token again, and you'll have to create another one. If you want to keep it, save it in your password manager; but **NEVER SAVE** tokens without encryption (in a note, in a piece of paper etc.). In my opinion, it's easier to keep the tab open until you finished the configuration. I don't see a reason to save it.
### 5.2 Use the token as a secret in `blog posts`
Now we need to add the token as a secret in the `blog-posts` repo, so that it can work as a sort of "password" that GitActions needs to authenticate and push the notes into the `blog` repo. Inside the `blog-posts` repo Settings, got to **Secrets and variables > Actions**, click **New repository secret** and fill in the form:
- Name: `ASTRO_REPO_TOKEN`
- Secret: the token you've just generated
## 6 Install the Obsidian GitHub Sync plugin
Back to Obsidian, go to the Community Plugins directory and search for GitHub Sync (by [kevinmkchin](https://community.obsidian.md/users/kevinmkchin)). Install it, enable it, open the plugin **Options** and paste your `blog-posts` repo link in **Remote URL**. That's it.

You'll find a couple of other options, such as automatic syncs, log level etc. You can set them as you find fit.
## 7 Test
Now that everything is wired and set up, you can create your first automated post. It's as easy as this:
1. Create a note from the template
2. When it's ready to publish, set `draft: false`
3. Activate GitHub Sync (or wait for the automatic sync, if enabled)
4. Read the post in your blog
## 8 Editing posts
It goes without saying that this pipeline is not limited to the creation of new posts. It also works if you want to edit published posts. You just have to edit an existing file in the Obsidian vault, sync with GitHub, and the blog post is updated. My advice is to leave `draft: true` while editing. 
## 9 Some caveats
- When the fine-grained Personal Access Token (PAT) expires, the pipeline will break: `ASTRO_REPO_TOKEN` becomes invalid, and the GitAction will not be able to push the files to the `blog` repo. Perhaps you should set some kind of reminder in your calendar.
- If you edit posts directly in the `blog` repo, that change is never reflected in the `blog-posts` repo, because there is no bidirectional communication. This entails that the two repos drift out of sync, and that means that notes may be deleted (because of the flag `--delete` in the GitAction). You should always use `blog-posts` as single source of truth for posts. 