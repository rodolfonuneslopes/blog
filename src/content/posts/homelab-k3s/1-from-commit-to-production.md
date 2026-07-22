---
title: "From commit to prodution: a homelab pipeline with full control"
author: rodolfonuneslopes
pubDatetime: 2026-07-20T05:13:19Z
featured: true
draft: false
tags:
  - homelab-k3s
description: An example of a pipeline with full control, since it includes the development phase of the service
---
In the [first post about my homelab](/posts/homelab-k3s/0-why-k3s/), I've put forth the reasons to use Kubernetes (with k3s) to manage self-hosted apps. One of them was the possibility to expose my own apps to the internet, according to the best practices; not only to assure the availability of the services, but also (and mainly) to keep my home network protected against all kinds of threat actors.

But, before explaining my decisions and strategy to build the homelab (which I'll be doing in the next posts), I'll give an example of a home made web app where I have full control: "from commit to production". Actually, it's an example of a whole system: I push a commit and, in a few minutes, the new version of the app is running in my k3s cluster. Later, in a series of articles, I will explain in detail my decisions to implement each step of the system. For now, let's see how it works from a high level perspective, using an example.
## The app [fogos](https://github.com/rodolfonuneslopes/fogos)
The app was the missing piece of the system. I've already had deployed [linkding](https://github.com/sissbruecker/linkding) and [audiobookshelf](https://github.com/advplyr/audiobookshelf), but these apps were made by someone else, so I had no control of the development cycle. I was abstracted of everything that happens before the deployment.
### Requirements and features
(*Check the full list at the project's [README file](https://github.com/rodolfonuneslopes/fogos/blob/main/README.md))*
Since the main purpose was to integrate an app in my home made infrastructure, I needed something simple. It should be as lightweight as possible (my homelab is [not so powerful](https://psref.lenovo.com/Detail/ThinkCentre_M900_Tiny?M=10FM002TUS)) and it would serve a single web page with some useful information. These were my key decisions:
- The **backend** is a single static Go binary that embeds all dependencies and assets at compile time, and only includes `singleflight` (an official package that optimizes concurrency). There is no web framework.
- The **frontend** is pure Vanilla JS (ES Modules) with [Pico CSS v2](https://picocss.com/) for styling
- The app is fully stateless (except for some caching strategies), which means I don't have to worry about storage and that I can kill/start new pods with no coordination efforts
- It compiles to a single static binary and ships as a [distroless](https://github.com/GoogleContainerTools/distroless) base image (no shell, no `curl`, `apt` etc.), and the container will run it as an unprivileged user (rather than root) with a read-only filesystem

As for what it does exactly, it is a SPA that shows active wildfire occurrences in Portugal, filterable by district (distrito) and municipality (concelho). It's very useful for people (like me) that live in the areas of Portugal that, every summer, are devastated by wildfires (*fogos* is the Portuguese plural for *fogo*, which means *fire* in general, but also *wildfire*). It's available at [fogos.nuneslopes.org](https://fogos.nuneslopes.org) and it's very easy to [self-host](https://github.com/rodolfonuneslopes/fogos/blob/main/README.md#getting-started) (it includes an [image in GHCR](https://github.com/rodolfonuneslopes/fogos/pkgs/container/fogos)).
### Public exposure
(*I use this method to expose all the apps that I have inside the cluster*)
The traditional approach would necessarily entail opening ports in the router, traffic forwarding, as well as exposing my public IP address, which would turn my network in a target worth of scanning for, insofar it would have listening services easily reachable. One misconfiguration could easily expose my entire home network. Besides these dangers, I would also have to handle TLS certificates manually, which is a huge headache, if you don't want to trigger those noisy security alerts in the browser.

Having all this in mind, I decided to use a third-party technology: a [Cloudflare Tunnel](https://developers.cloudflare.com/tunnel/). This extraordinary service consists of installing a daemon (`cloudflared`) inside the cluster that opens an outbound connection to Cloudflare's network and everything else is done by/in Cloudflare's own infrastructure. You don't have to worry about ports, public IP, DNS, TLS certificates etc. And you even get great additional features such as DDos mitigation and dashboards with every possible data vector. Since I've already had my domain registered with Cloudflare, it was really easy to make all the necessary configurations.

Personally, I prefer one Cloudflare Tunnel per app, because it allows me to have dedicated credentials: if one credential is compromised, only one route is affected. Of course it entails more complexity in managing secrets, but it's much safer.
## The path from commit to production
Finally, let's get to the main subject of this post: the system that turns a commit into a new running version of the `fogos` app. Actually, the first step isn't a commit, because it would make sense to trigger the whole workflow every time I make a change. Here's the full path:
1. **(`fogos` GitHub repo)**: when all changes are ready to release, a `v*.*.*` tag is pushed to `fogos` GitHub repo and the system is triggered
2. **(`fogos` GitHub repo)**: when the new tag is pushed, GitHub Actions runs tests (`go test`, `make test` and `node --test` for logic tests) and checks (`gofmt` and `go vet`)
3. **(`fogos` GitHub repo)**: GitHub Actions compiles the Go binary and builds a distroless image with the new tag
4. **(`fogos` GitHub repo)**: GitHub Actions publishes the new image in the GHCR (`ghcr.io/rodolfonuneslopes/fogos`)
5. **(k3s cluster)**: [Renovate](https://github.com/renovatebot/renovate) (that runs every hour with a `CronJob`) detects that there is a new tag for the `fogos` image in the GHRC
6. **(`homelab-k3s` GitHub repo)**: Renovate opens a PR to edit the affected `Deployment` file so that the image is updated (check this [example of a Renovate PR](https://github.com/rodolfonuneslopes/homelab-k3s/pull/11)) that updates `fogos` to the version `0.1.6`)
7. **(`homelab-k3s` GitHub repo)**: I review the PR and, if there are no conflicts, I merge it to main. This is the only manual step in the entire system. It works as the final gate before the changes enter in the cluster
8. **(k3s cluster)**: [FluxCD](https://fluxcd.io/) (runs every 10 minutes) detects the change in the `homelab-k3s` GitHub and reconciles the cluster, matching the new state that was declared in the `homelab-k3s` GitHub repo
9. **(k3s cluster)**: the old `fogos` pod is replaced by a new one seamlessly, because the app is fully stateless (it requires no coordination or data migration)
10. **(Cloudflare Network)**: the Cloudflare Tunnel keeps `fogos.nuneslopes.org` routed to the new version of the app
### Diagram
```
DEVELOPER
     │
     │ git tag v*.*.*
     ▼
 ┌─────────────────────────────────────────────┐
 │  GitHub Actions CI                          │
 │  ─────────────────                          │
 │  1. go test / make test                     │
 │  2. go vet / gofmt check                    │
 │  3. docker build                            │
 │  4. docker push  ─────────────────────────┐ │
 └────────────────────────────────────────────┼┘
                                               ▼
                                   ┌───────────────────────┐
                                   │  ghcr.io/.../fogos    │
                                   │  (container registry) │
                                   └───────────┬───────────┘
                                               │
                                               │ new image digest/tag
                                               ▼
                                   ┌────────────────────────┐
                                   │  Renovate              │
                                   │  watches image tags in │
                                   │  homelab-k3s manifests │
                                   └───────────┬────────────┘
                                               │
                                               │ opens PR
                                               ▼
 ┌───────────────────────────────────────────────────────────┐
 │  homelab-k3s (infra repo)                                 │
 │  ────────────────────────                                 │
 │  PR bumps image tag in apps/fogos/...                     │
 └───────────────────────────┬───────────────────────────────┘
                              │
                              │ review + merge to main
                              ▼
                  ┌───────────────────────────┐
                  │  Flux (GitOps controller) │
                  │  polls git, detects diff  │
                  └─────────────┬─────────────┘
                                │ reconcile
                                ▼
        ┌────────────────────────────────────────────────┐
        │  k3s cluster — clusters/staging                │
        │                                                │
        │              ┌───────────────────────┐         │
        │              │ fogos deployment/pod  │         │
        │              │ (new image running)   │         │
        │              └─────────── ───────────┘         │
        │                                                │
        │                                                │
        └───────────────────────┬────────────────────────┘
                                │
                                │ outbound-only tunnel
                                │
                                ▼
                    ┌───────────────────────────┐
                    │  Cloudflare Tunnel        │
                    │  (cloudflared → cluster)  │
                    └─────────────┬─────────────┘
                                  ▼
                    ┌────────────────────────────┐
                    │  Cloudflare edge           │
                    │  TLS termination + routing │
                    └─────────────┬──────────────┘
                                  ▼
                       fogos.nuneslopes.org
```
## Conclusion
That's it! When a new tag is pushed to the `fogos` GitHub repo, I manually review the changes that will afect the cluster state and, a few minutes later, a new version of the app is served. In the following posts, I will explain in detail my decisions to implement each step of the system.