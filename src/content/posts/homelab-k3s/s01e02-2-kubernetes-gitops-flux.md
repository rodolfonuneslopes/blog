---
title: Homelab S01E02 (pt.2) - When the repo is the cluster #2 (GitOps with Flux)
author: rodolfonuneslopes
pubDatetime: 2026-08-11T05:13:19Z
featured: true
draft: false
tags:
  - homelab
  - kubernetes
  - gitops
description: How to implement GitOps with Flux in a Kubernetes cluster
---
This article is the second part of the topic "When the repo is the cluster". The [first part](/posts/homelab-k3s/s01e02-1-kubernetes-gitops) was about GitOps from an agnostic point of view. This second part is dedicated to the implementation of GitOps. It goes without saying that the first part should be read first. 
## Implementing GitOps with Flux
Since GitOps is a methodology, we need tools to implement it (besides Git). The first one is a service to host the repository. For this purpose, GitHub is by far the best option for all possible reasons. But we also need a controller to reconcile the state of the cluster with its desired state (declared in the repo). The main feature will be running an infinite loop with these steps:
- Check the state of the repo
- Compare the state of the repo to the state of the cluster
- Apply the differences (repo > cluster)
- Repeat

Of course it must include other features that allow us to optimize the reconciliation workflow as much as possible. It would be nice to have seamless integrations with Kubernetes native services, but also with technologies like [Helm](https://github.com/helm/helm) and [Flagger](https://github.com/fluxcd/flagger); as well as multi-source support to prevent GitHub from being a Single Point of Failure. Ideally, it should also be lightweight, open-source and easy to maintain. 
### Flux vs Argo CD
That leaves us with two options: [Flux](https://github.com/fluxcd) and [Argo CD](https://github.com/argoproj/argo-cd). Both are excellent tools, but Flux is more lightweight (perfect for a homelab) and it's built as a set of Kubernetes native controllers. That's why it doesn't require separate components (API Server, Repo Server, a Web UI etc.) the way Argo does. 
### Organizing the Flux repo
I call it "Flux repo", because it was created from the official Flux documentation on how to "[organize repositories for a smooth GitOps experience with Flux](https://fluxcd.io/flux/guides/repository-structure)". This first decision is of extreme importance, because it will determine the structure of the repo and, therefore, of the whole cluster. It is a decision that you make only once. If you're building a house, later you can change the windows, the kitchen etc., but can't change the framing. 
#### [Monorepo](https://fluxcd.io/flux/guides/repository-structure/#repository-structure)
I've chosen the `Monorepo` approach, because it is the best practice for using Flux with a single Git repository that holds all the Kubernetes manifests. That's exactly my case. I personally think that the best practice is to follow the best practices that the maintainers publish in the official documentation.

Flux's monorepo approach centralizes scalability. Even though it points to a single Git repository, it's designed for enterprise-grade scale. The architectural decisions are grounded in a **base-overlay pattern** (the so-called **[Kustomize](https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/) overlay pattern**): a base layer is used as a template to provide environment-agnostic functionality (mostly `Deployment` and `Service` files), and there are environment overlays (`staging` and `production`) that inherit the functionality of the base layer. Then we can add environment-specific features, such as replica counts, environment variables, resource limits etc. As the name suggests, it works in layers:
1. a `base` layer holds environment-agnostic resources, such as the `Deployment` (container image name, ports, volume mounts etc.) file. It tells "what the app *is*".
2. `staging` and `production` layers that add environment-specific details to the functionality that was inherited from the `base` layer, such as the `replica` count (in the `staging` layer 1 replica is enough, but the `production` will demand more replicas to ensure full availability). Each of these layers tell "how the app runs *in this context*"

Here's the repo tree diagram from Flux's official documentation:
```
.
├── apps
│   ├── base
│   ├── production
│   └── staging
├── infrastructure
│   ├── base
│   ├── production
│   └── staging
└── clusters
    ├── production
    └── staging
```
- `apps/`: the actual application deployments
- `infrastructure/`: cluster-wide functionality, such as ingress controllers, monitoring stack etc.
- `clusters`: pointers to the locations of each cluster's workload resources (inside `apps/` and `infrastructure/`)

What really happens is that the YAML files in `production` and `staging` work as patches to the files that live in `base`. For example, if I want to have 100 replicas in production and only 1 replica in the staging environment (for testing etc.), I only need to add a patch inside `production` that specifies `replicas: 100`. If the `Deployment` file inside `base` has `replicas: 1` (or nothing, and it will default to 1), that will be automatically inherited by the staging layer. To override it in the production layer you only need something like `replicas-patch.yaml` inside `production`:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 100
```
#### Installing Flux
After creating the repo, you must [install Flux](https://fluxcd.io/flux/installation/) and then [bootstrap it](https://fluxcd.io/flux/cmd/flux_bootstrap/) against the repository, by running a command like this one:
```bash
flux bootstrap github \
  --owner=rodolfonuneslopes --repository=homelab-k3s \
  --branch=main --path=clusters/staging --personal
```
After install, Flux creates its own namespace (`flux-system`) to store the resources that it needs to perform the reconciliation loop. The main file will be `gotk-sync.yaml` that Flux will use to point this instance to the repo:
```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 1m0s
  ref:
    branch: main
  url: ssh://git@github.com/rodolfonuneslopes/homelab-k3s
```
## Flux main components
But how can this inheritance-oriented system be translated into Kubernetes functionality? Like I said earlier, one huge advantage of using Flux is that it relies upon Kubernetes native features. And it does it in a very clever way, except for one very misleading naming choice: `Kustomize` and `Kustomization`. Yet, before going deep into that problem, we must talk about another really important Kubernetes native feature that Flux lives on.
### Custom Resource Definitions (CRD)
**Custom Resource Definitions (CRD)** provide the functionality to expand the types of objects that a Kubernetes API server can "understand". Natively, it knows about `Pod`, `Deployment`, `Service` and so on, which act as classes that objects are instantiated from. When we create a Deployment for a given app, we are creating a new object of the type `Deployment`. What if we want to add new "classes" to create custom-type objects? We can use CRDs.

A perfect example of the use of CRDs with custom controllers is the way Flux watches the repository. At bootstrap, it installs a `GitRepository` CRD (an object with the information about the repository) and, from that moment on, the Kubernetes API understands this new kind of object. Bootstrap then creates a `GitRepository` object holding the repo URL, the branch and the polling interval. 
### `Kustomize` vs. `Kustomization`
Back to the `Kustomize` vs. `Kustomization` problem, let's start by defining each one of these keywords:
- `Kustomize` is a standalone tool (also a [Go library](https://pkg.go.dev/sigs.k8s.io/kustomize)) that has shipped with `kubectl` since Kubernetes 1.14. It allows combining YAML files to build a final set of customized manifests. It can be used by Flux or by any other component that needs to combine YAML files for some reason.
- `Kustomization` is a CRD created by Flux so that the Kubernetes API "understands" the type (`kustomize.toolkit.fluxcd.io/v1`) of objects that need to be created, allowing Flux to perform the reconciliation cycle.  

In my opinion, the conceptual problem arises for these reasons:
1. In our natural languages, a `Kustomization` would be the result of the action `Kustomize`
2. `Kustomize` requires its configuration files (i.e. the breadcrumbs that allow the combination of YAML files) to be named exactly `kustomization.yaml`.
3. Both `kustomization.yaml` files and instances of `Kustomization` are `kind: Kustomization`

The first one is easy: never rely upon analogies with natural languages. It's a good way to start analyzing a problem, but extremely misleading if we dive deeper. The second one is also easy: it's a naming convention and nothing else.

As for the third one, it is trickier and, in my opinion, the root of the problem is also an analogy. At least, that's what happened to me. When we see something like `kind: Kustomization`, we are naturally inclined to see it as a type, as if Kubernetes were a compiled language: each type must be unique. If I have a type `Kustomization`, all objects that instantiate a `Kustomization` class are of the type `Kustomization`. Of course, there can only exist one type `Kustomization`. Well, Kubernetes is not a compiled language, and `kind:` is not a type on its own. This rule is valid inside the Kubernetes API, where we can have only one `Kustomization`. But the `Kustomization` in the `kustomization.yaml` files is a `Kustomize` configuration type and does not live in the Kubernetes API. So, they are different things. They would have the same "type" only if they also had the same `apiVersion`.

These [two snippets from my repo](https://github.com/rodolfonuneslopes/homelab-k3s/tree/main/clusters/staging/flux-system) are good examples. They are the `Kustomization` and `kustomization.yaml` files that Flux itself needs to work:
```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- gotk-components.yaml
- gotk-sync.yaml

# gotk-sync.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 10m0s
  path: ./clusters/staging
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```
### `source-controller` and `kustomize-controller`
In the Kubernetes world, a **controller** is a piece of software that runs in a continuous loop, matching cluster state to a desired state that is declared somewhere. Kubernetes is shipped with dozens of native controllers to perform all kinds of tasks. With Flux, we'll need some additional custom controllers to perform the reconciliation loop: `source-controller` and `kustomize-controller`.

The `source-controller` is responsible for fetching data from remote sources (it's the only component that interacts with external systems), such as Git repos and OCI registries. It owns CRDs like `GitRepository` and `OCIRepository` to, for example, store the connection configurations (fetch interval etc.). 

The `kustomize-controller` is responsible for getting from `source-controller` the newly detected changes and applying them to the cluster. It **calls** `Kustomize` to build the manifests according to the **base-overlay pattern** and enacts its own `Kustomization` objects to "translate" the changes in the cluster.
## The `Kustomization` flow
We now have all necessary elements to reproduce the steps of a Flux reconciliation. Here's what happens when you commit a change in the repo:
1. After the specified interval, the `source-controller` notices a new commit. It then:
	1. Clones the whole repo and packages it into a tarball
	2. Publishes the tarball as an artifact with a revision hashcode
	3. Creates an internal file server where the `kustomize-controller` can get the artifact from
2. The `kustomize-controller` sees that the artifact revision hashcode has changed, which means that there are new changes to apply. It then:
	1. Gets the new artifact (i.e. the new version of the whole repo in a single tarball)
	2. Extracts the tarball and calls `Kustomize` to build the `kustomization.yaml` graph
	3. Emits the final flat list of manifests with new Kubernetes objects
	4. After a server-side dry-run fro validation, it applies the manifests to the Kubernetes API
## The repo is the cluster
Here's the final structure of my [repo](https://github.com/rodolfonuneslopes/homelab-k3s):
```text
.
├── clusters/staging/         # Flux lives here
│   ├── flux-system/          # Flux's own manifests, re-applied every 10m
│   ├── apps.yaml             # → apps/staging (prune + cryptography)
│   ├── infrastructure.yaml   # → infrastructure/controllers/staging
│   └── monitoring.yaml       # → monitoring/{controllers,configs}/staging
│
│   ═════════ below this line, nothing knows Flux exists ═════════
│
├── apps/
│   ├── base/<app>/           # what the app is:  Deployment, Service, PVC
│   └── staging/<app>/        # how it runs here: namespace, tunnel, secrets
├── infrastructure/controllers/{base,staging}/
└── monitoring/
    ├── controllers/          # HelmRepository + HelmRelease
    └── configs/              # the secrets that release consumes
```