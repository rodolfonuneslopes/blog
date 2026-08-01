---
title: "When the repo is the cluster #1 (GitOps)"
author: rodolfonuneslopes
pubDatetime: 2026-08-01T05:13:19Z
featured: true
draft: false
tags:
  - homelab-k3s
description: How to manage a Kubernetes (k3s) cluster with GitOps
---
Every information system is made of files. From the Inquisition archives in the 1500s to modern data centers, "everything is a file". Just like the Trial of Joan d'Arc was made up of files, the processes of a modern Operating System are represented as files. Literally: a Linux-based system will have all running processes represented as files inside the directory `/proc/`. We can read these files in the same way we can read every type of file.

But a file is not a document or a record. "File" comes from the Latin word *filum*, which means "thread", "string" or "cord". In the early days of IT, many centuries ago, this *filum* was used to string a group of documents in a given sequence: each document was pierced and threaded onto a string, according to a specific sequence. Without the *filum* to provide the reading order (i.e. the proper "wiring"), all those documents would be a big pile of raw and useless data. 

We may think of a file as an information unit whose meaning lies in its relations to other units (i.e. files) in a given context. The unit itself has no meaning at all. A digital file is a sequence of bytes that must have a path inside a filesystem, be referenced by a given program etc. In a Linux distribution, there will be a file called `passwd` inside the `etc` directory that the system uses to store user account information. If I copy `passwd` to another directory, it will be a different file, even if the sequence of bytes is exactly the same. What the file *is* depends mostly on its relation to other files in the directory hierarchy. 
## A Kubernetes cluster *is* a sequence of files
So, any information system (an app, an entire OS) can be represented as a sequence of files. Actually, any information system *is* a sequence of files. Just like any other information system, a Kubernetes cluster is a sequence of files that "talk to each other" through a referencing system. 

For example, a `ConfigMap` sitting alone in a namespace is just a meaningless list of key-value pairs. If a `Deployment` references it (by matching the value of `envFrom.configMapRef` with the value of `metadata.name` inside the `ConfigMap`), that very same file becomes the configuration of a given service. 

 If a cluster is a sequence of files, it means that we can (should?) treat it (and manage it) as a repository. It makes perfect sense, since it's the best way to organize files that are being continuously changed, most times by different people, often causing unpredictable effects that demand reverting some of those changes. Of course, if we have something that can be represented in a repository, we need Git. Given that this repository holds a Kubernetes cluster, we also need some framework to implement DevOps practices in Git.
## The "traditional" API-oriented way with `kubectl`
The out-of-the-box way of managing a cluster is by interacting with the Kubernetes API (exposed by `kube-apiserver`). After setting the configurations (IP address, port etc.) on the client machine(s) that will consume its functionality, we only need to execute `kubectl` in a shell to perform a given action in the cluster. It works like any other tool that you can run inside a shell, and the syntax is practically that of a natural language (`kubectl [action_to_perform] [resource_type] [resource_name] [additional_options]`). Some basic examples:
- `kubectl scale deployment my-app --replicas=3` scales `my-app` up to 3 replicas
- `kubectl delete service my-service --grace-period=0` deletes `my-service` and waits 0 seconds to do it

This imperative and manual interaction with the cluster is the best way to start with Kubernetes, since you only need an afternoon to master a handful of commands to immediately spin up some pods and actually have working services. It is also very useful to get important and live information, such as logs (`kubectl logs`) or the details of a specific resource (`kubectl describe`), and to execute commands inside a running container (`kubectl exec`). But when it comes to managing a cluster that demands dozens (hundreds, thousands...) of daily maintenance operations, the `kubectl` way of life is too dangerous to live: 
- The cluster's desired state is inside the cluster itself and nowhere else
- Anyone with authorization has direct access to the cluster
	- Ergo, anyone can make changes that go straight to production with no review
- `kubectl apply/edit/delete` operations leave no clear/easy-to-read records of *who* changed *what* and *why*
	- It demands a perfectly organized workflow that would update the cluster documentation every time someone changes something
- Recovering from a bad change means manually analyzing and reconstructing YAML files
- Recovering from a full cluster failure means hundreds or thousands of manual interactions with the Kubernetes API
	- It demands a perfectly designed (and regularly tested) disaster recovery plan
- If the infrastructure is distributed across multiple clusters and/or environments, it means running commands against each context

Every one of these scenarios would be an innocuous theoretical hypothesis if every change to the cluster was made by someone running the right command, from the right machine, within the right context, using the right credentials, all of this done at the right time. But that's not a real-world scenario. Just like developers need Version Control Systems to track, review and roll back changes to code, DevOps engineers need something similar to track, review and roll back changes to the infrastructure.
## Using GitOps
Just like developers use Git, DevOps engineers use GitOps. Yet, unlike `git`, GitOps is not a binary that we can install in our operating system and use as any other application. Instead, it is a methodology (with a [very interesting history](https://www.gitops.tech/)) that can be implemented with a variety of tools. But, before diving into the implementation tools, we need to understand the model in a tool-agnostic way. Let's revisit the two previous examples of imperative, direct interaction with the Kubernetes API:
- `kubectl scale deployment my-app --replicas=3` scales `my-app` up to 3 replicas
- `kubectl delete service my-service --grace-period=0` deletes `my-service` and waits 0 seconds to do it

With GitOps, you only need to edit two files to get that very same outcome: 
- Set `spec.replicas: 3` in the `Deployment` file for `my-app` 
- Delete the `Service` file for `my-service`

The main difference is that, when we edit the files, the changes are not directly applied to the cluster. These changes, after being committed, will be analyzed by a defined CI/CD pipeline with several checks (some automatic, some made by humans, it depends). After passing all checks, the changes are then applied to the cluster. The Git repository is the **single source of truth**, since it has the desired state of the cluster, the way that the system *should* look. This brings very important benefits, so that those problems I mentioned earlier, regarding the use of `kubectl` commands, are completely gone:
- The cluster's desired state is **outside** the cluster
- Changes must be **reviewed** before going to production (normally through Pull Requests)
- The complete **history and audit trail** is one `git log` away
- **Recovering** from a bad change means reverting a commit
- **Recovering** from a full cluster failure means pointing a fresh install at the same repo
- If the infrastructure is distributed across **multiple clusters and/or environments**, you just need to follow the right convention to organize the repository (we'll get to this later).
## Implementing GitOps
But, like I've said earlier, GitOps is not a binary that we can install in our operating system. It is a methodology, a framework in the broadest possible sense, that needs to be implemented. That's the subject of the [next post](/posts/homelab-k3s/2.1-kubernetes-gitops-flux).