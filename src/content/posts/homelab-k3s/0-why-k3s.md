---
title: Kubernetes in a home server? YES! 
author: rodolfonuneslopes
pubDatetime: 2026-07-07T05:17:19Z
featured: true
draft: false
tags:
  - kubernetes
  - homelab-k3s
---
Yes, you should use Kubernetes on your home server. No, it's not overengineering. This post (the first one I've ever published) will show you why. The next posts will show you how. 

A couple of months ago, I got a small form factor PC to use as home server. The purpose was to self-host the apps I need in my daily digital life. Instead of using SaaS solutions that either cost me money or keep my personal data (or both), I've embraced' the self-hosted way of life.

The initial approach was the classic "Docker Compose strategy": create a container per app, manage the containers through basic configuration files and assign them different ports at the OS layer. After a couple of days (and apps), my browser already had a bookmark folder to track the mapping between apps and ports. So I decided to put everything behind a reverse proxy (I used the most noble Nginx Proxy Manager) with a local DNS resolver, that allowed me to have n8n.server.lan instead of 192.168.1.100:5678, and so on. Much better now.

Then I started to create apps only for fun, and it happened that one of them could be useful for many people that I know (and that I don't know). So I asked myself: "what if I want to expose some apps to the public?". I soon realized that the current setup would lead me to an implementation hell: NAT, firewalling, tampering with the ISP router etc. There's where I found Kubernetes. 

At first, it was a bit strange to use enterprise-grade software in my humble home server. But there was k3s, which is the perfect Kubernetes distribution for this case: lightweight yet powerful, suitable for learning Kubernetes yet perfectly scalable, and bundling together (ergo, abstracting me from) the necessary set of technologies (Traefik for ingress, local-path-provisioner for storage etc.). At the same time, it offers seamless integration with many other technologies, such as Cloudflare Tunnels to securely expose the apps to the public.

If Kubernetes in a home server is overengineering, what about a Linux distro in a "smart" vacuum cleaner? But can you think a better way to connect a vacuum cleaner to the internet? I suppose not. Imagine that you want to use a home server forever as your main source of digital services. It must scale correctly; otherwise you'll be swallowed by a technical debt that keeps growing over time.

But enough of talking. As someone great used to say, "show me the code!". In fact, I can show you all the necessary code to run my Kubernetes cluster. Well, not all: I'll keep for myself all the secrets (passwords, tokens etc.) and also my private key, and there are some configs that need manual implementation. But, for the most part, if I want to migrate everything to a different machine, I just have to clone a repository. And this repository is public (link below)! It seems crazy to share the details of your personal infrastructure, but that's one of the most beautiful things in Kubernetes, when configured in a certain way. It's Open-Source and Open-Security all over. 

Finally, I can also share my first public app. It's a simple SPA that shows the updated list of wildfires happening in Portugal. It may be of use for not so many people, but the only thing it needs to run (besides myself, on rare occasions) is some electricity. You can use it at [fogos.nuneslopes.org](https://fogos.nuneslopes.org) (FYI, "fogos" is the plural of "fogo", that means "fire"), and you can do whatever you want with it (including collaborate) from the GitHub public repository (link below).

Home server repository: https://fogos.nuneslopes.org
App for tracking wildfires (in Portugal): https://github.com/rodolfonuneslopes/fogos