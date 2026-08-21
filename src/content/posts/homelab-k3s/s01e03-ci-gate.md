---
title: Homelab S01E03 - The CI gate
author: rodolfonuneslopes
pubDatetime: 2026-08-18T05:13:19Z
featured: true
draft: false
tags:
  - homelab-k3s
description: Why and how to create a CI gate in a Kubernetes cluster managed by GitOps
---
The most basic premise of a Kubernetes cluster managed by GitOps with Flux is that its desired state lives on a repository hosted in GitHub. This means the cluster must constantly **poll a remote source and pull from it** to match the state it is supposed to be in. Flux simply assumes that the state that is declared in the repository is the cluster's desired state.

What if the state that is declared in the remote repo is not so desirable after all? A simple YAML syntax error in a manifest could lead to time-wasting errors and inconsistent states. Since the GitHub repo is the single source of truth, it is also a single point of failure for the delivery pipeline. Therefore, validation has to happen before Flux pulls and applies the changes into the cluster. 
## The CI gate
**Continuous Integration (CI) gating** consists of implementing checkpoints that validate code changes before they are merged and deployed. Broadly, they stop errors before they spread. You can create quality gates to measure code coverage and unit tests, security gates that look for vulnerabilities, exposed secrets etc., or even compliance gates to check if the code follows a given set of standards.

Like any checkpoint, it is a mandatory stop on a specific path. For example, in an airport, you need to provide a boarding pass and a valid passport to pass the boarding gate. Without one of these two documents, you are blocked. The validation rules can be customized to a greater extent, such as calling the police if the passport owner is a wanted criminal, or emitting a non-blocking alert if its expiry date is close. But its basic function is to work as a binary gate that returns either red or green. 
## Implementing a CI gate in GitHub
Since I'm using GitOps to manage the cluster, the best place to install a gate is GitHub. First of all, it would be absurd to implement a CI gate inside the cluster, since the whole point of having a gate is to put it *before* the thing it is protecting. Besides, GitHub has excellent features to implement CI gates, and you can use them for free if the repo is public (exactly my case). The best "place" to install the gate also provides free tools and materials to build first-class gates. 

Some of the features are mere SDLC best practices, such as disabling direct pushes to `main`, forcing the changes to pass through a PR. But GitHub also provides a fully equipped sandbox to perform all the desired checks and tests. 
### Create branch protection rules on `main`
GitHub provides really easy-to-implement rules to protect the `main` branch, all of them available in `Rulesets` under the repository's Settings. You only need to tick some checkboxes to get a considerable upgrade in security. Create a new ruleset (I called mine `protect-main`) and set the following configurations:
- `Require a pull request before merging`: this will create a PR gate and prevent direct pushes to `main`
- `Block force pushes`: enforces the previous rule, preventing force pushes
- `Require code quality results`: I suggest setting the Severity to `Errors`
- `Automatically request Copilot code review`: useful if you have a Copilot subscription
### Create custom checks with GitHub Actions
This is one of GitHub's most powerful features, and it's absolutely free for public repos. It gives you a dedicated environment to execute customized scripts. You only need to add YAML files inside `.github/workflows/` that define a trigger and the actions to be performed. A trigger can be a repository event (a pull request, a push), a schedule, or a manual button in the GitHub Actions tab, and the actions to be performed are, actually, bash commands.

Let's take a very simple example. When you're editing files, you leave the string `TBD` in a comment to mark something still to be done. Before merging, you need to check if the string `TBD` exists in any file. You only need a bash script that uses `grep` to look for that string and an `exit 1` fail code if `TBD` is found somewhere. It's as simple as putting this YAML file inside `.github/workflows/`:
```yaml
# .github/workflows/no-tbd-comments.yaml
name: no-tbd-comments

on:
  pull_request:
  push:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - name: Fail if any TBD is committed
        run: |
          if grep -rn 'TBD' --exclude-dir=.github --include='*.yaml' .; then
            exit 1
          fi
```

GitHub will automatically detect files inside `.github/workflows/` and treat each one of them as a workflow that needs to be executed when a specific action occurs (the trigger). The `on` field specifies the criteria that trigger the workflow: a PR (`on.pull_request`) or a push to main (`on.push.branches: [main]`). The `jobs` field sets the actions to be performed via shell commands: if the string `TBD` is found, the process returns a fail code (`exit 1`). Of course, a workflow can have multiple `jobs` and a `job` can have multiple `steps`. That's what makes this tool so powerful. But how does this really work under the hood? 
#### GitHub's virtualized infrastructure
This is why I like this feature so much. When a workflow is triggered, GitHub has a virtualized infrastructure to provide all the necessary environments. It has a fleet of ephemeral VMs that are deployed according to the number of `jobs` declared in the scripts. The most beautiful detail is that each `job` will have its own Ubuntu VM (that's the meaning of `runs-on: ubuntu-latest`), allowing true parallelism, as well as providing isolation.

You can check all the details of what's happening in the GitHub Actions tab. The logs are verbose and laid out step by step. But, from a higher level perspective, here's what happens:
1. GitHub's backend system detects an event that triggers a workflow
2. GitHub Actions scans the files inside `.github/workflows/` and checks which ones have the detected event inside `on:`
3. All matching workflows are queued and each `job` gets its own VM
4. Each VM boots and runs the `steps:` (shell commands with `run:` and/or pre-packaged actions with `uses:`)
5. The job either fails or passes and the result is displayed in the GitHub Actions tab
6. The VM is destroyed

This very simple methodology allows you to have a dedicated Ubuntu VM with a fully equipped Operating System to perform whatever checks you need. It ships with a toolkit already installed (Docker, `git`, common language runtimes, `kubectl`), and anything missing is one `apt install` away, and it also provides the necessary infrastructure to create whatever tools you may need. Write customized scripts, upload them to `.github/workflows/` and GitHub Actions will do the magic.
### A minimal gate
In my case, since I'm using GitOps with Flux to manage the cluster, I've decided to start the CI gate with a check that answers to a very simple question: if this PR is merged, will `kustomize-controller` be able to turn the code into Kubernetes objects? As I said in the beginning, Flux simply assumes that the state that is declared in the GitHub repo is the cluster's desired state. But what if the repo's state is not so desirable after all? A simple YAML syntax error can cause a lot of trouble, like taking down an app. So, the first component of my CI gate is a script (`.github/workflows/validate.yaml`) that performs two validations:
(Check the comments of the [file](https://github.com/rodolfonuneslopes/homelab-k3s/blob/5d7039cbc16e1d3a3441ffceb7be576f23c5351b/.github/workflows/validate.yaml) for further details)
1. **Does the code build?** It uses `kubectl kustomize` to resolve bases, patches, generators, and name references. If there's a missing resource or a malformed `kustomization.yaml`, the check will fail.
2. **Is the output valid Kubernetes?** It uses `kubeconform` to check each rendered document against a JSON schema from the official Kubernetes OpenAPI specifications. If there's a mismatch, the check fails.
#### Update branch protection rules
So that this works as a real gate, you must edit the ruleset you created earlier, that must include the checks inside `.github/workflows/validate.yaml`. You just have to tick the option `Require status checks to pass`, click `Add checks` and search for `validate`. Save the changes and it's done.
### A minimal vulnerability scanner
I've also added a security layer that is deliberately not a gate. It's meant to work as an alerting service. For that reason, it's triggered only when a change is pushed to main, not when someone creates a PR. It also has a nightly cron, running automatically every night at 3:17AM (UTC). 

For now, it does one thing: scan every container image this repository puts on the cluster for known vulnerabilities (CVEs) and report the findings to GitHub's Security tab. The script (`.github/workflows/scan.yaml`) has two `jobs`: 
(Check the comments of the [file](https://github.com/rodolfonuneslopes/homelab-k3s/blob/5d7039cbc16e1d3a3441ffceb7be576f23c5351b/.github/workflows/scan.yaml) for further details)
1. `collect`: it uses a helper script (`.github/scripts/collect-images.py`) to discover all images and then prints a JSON array on stdout for the next job's matrix, and a human-readable inventory on stderr.
2. `scan`: it takes the JSON array created by `collect`, runs [Trivy](https://github.com/aquasecurity/trivy) against each image and uploads the results as SARIF to GitHub's Security tab.
## Final thoughts: risk and resource management
This minimal CI gate doesn't blindly block everything that causes some kind of risk to the cluster. When you have some kind of infrastructure (even if it is a homelab), you must accept a certain amount of risk. The only possible way to fully eradicate risk is not having services at all. So you must set the *risk appetite*, which is the level of risk that you are prepared to accept. In my case, I'm not willing to take the risk of pulling into the cluster manifests that:
1. Don't render exactly the way `kustomize-controller` will render them in the cluster
2. Aren't validated against the real Kubernetes and Flux CRD schemas.

On the other hand, I accept the risk of running images that have known vulnerabilities, as long as I can see them immediately. The main reason is that CVE severity doesn't map cleanly to actual risk. Vulnerability management is not something you can fully automate, because you always need a human validation to frame each finding in its specific context. Besides, if a CVE finding blocked the pipeline, it would disrupt service availability, and I would have an incident caused by a security measure, which is absurd.

The same reasoning goes for resources. When Trivy scans for vulnerabilities in dozens of images, it consumes lots of computing resources. Implementing this minimal vulnerability scanner locally would waste my (limited) hardware capabilities. If GitHub offers a whole infrastructure to perform those scans in the best way possible, why would I waste my own resources, overloading a humble homelab with daily heavy tasks? The only possible reason to avoid it would be privacy, but all the code of my homelab is [public](https://github.com/rodolfonuneslopes/homelab-k3s). The Open Source philosophy has its benefits.