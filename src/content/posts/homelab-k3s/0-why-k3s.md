---
title: Kubernetes in a home server? YES!
author: rodolfonuneslopes
pubDatetime: 2026-07-07T05:17:19Z
featured: true
draft: false
tags:
  - kubernetes
  - homelab-k3s
description: The reasons why you should use Kubernetes in your home server
---
Yes, you should use Kubernetes in your home server. No, it's not overengineering. This post will show you why. The next posts will show you how. 

A couple of months ago, I got a small form factor PC to use as home server. The purpose was to self-host the apps I need in my daily digital life. Instead of using SaaS solutions that either cost me money or keep my personal data (or both), I've embraced' the self-hosted way of life.

The initial approach was the classic "Docker Compose strategy": manage containers through configuration files and assign them different ports at the OS layer. After a couple of days (and apps), my browser already had a bookmark folder to track the growing mapping between apps and ports. So I decided to put everything behind a reverse proxy (I used the most noble Nginx Proxy Manager) with a local DNS resolver, that allowed me to have n8n.server.lan instead of 192.168.1.100:5678, and so on. Much better now.

Then I started to create apps only for fun, and it happened that one of them could be useful for many people. So I asked myself: "what if I want to expose some apps to the public?". I soon realized that the current setup would lead me to an implementation hell: NAT, firewalling, tampering with the ISP router etc. There's where I found Kubernetes. 

At first, it was a bit strange to use enterprise-grade software in my humble home server. But there was k3s, which is the perfect Kubernetes distribution for this case: lightweight yet powerful, suitable for learning Kubernetes yet perfectly scalable, and bundling together (ergo, abstracting me from) the necessary set of technologies (Traefik for ingress, local-path-provisioner for storage etc.). At the same time, it offers seamless integration with many other technologies, such as Cloudflare Tunnels to securely expose the apps to the public.

If Kubernetes in a home server is overengineering, what about a Linux distro in a "smart" vacuum cleaner? But can you think a better way to connect a vacuum cleaner to the internet? I suppose not. Imagine that you want to use a home server forever as your main source of digital services. It must scale correctly; otherwise you'll be swallowed by a technical debt that keeps growing over time. Scalability is the main reason to do this, and the idea of a long-term home server requires scalability.

But enough of talking. As someone great once said, "show me the code!". In fact, I can show you all the necessary code to run my Kubernetes cluster. Well, not all: I wont show you my private key, and there are some configs that need manual implementation. But, for the most part, if I want to migrate everything to a different machine, I just have to clone a repository. 

And this repository is public (link below)! It seems crazy to share the details of your personal infrastructure, but that's one of the most beautiful things in Kubernetes, when configured in a certain way. It's Open-Source and Open-Security all over. If I may leave a teaser for the next post, check out [FluxCD](https://fluxcd.io/).

Well, here's the [link for the public repo with all my homelab code](https://github.com/rodolfonuneslopes/homelab-k3s). Your feedback would be very much appreciated.