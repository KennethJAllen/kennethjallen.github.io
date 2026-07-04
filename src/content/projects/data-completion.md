---
title: Data Completion
summary: Research on low-rank matrix and tensor completion methods.
image: ../../assets/images/image-completion.png
imageAlt: Sparse Lincoln silhouette reconstructed via matrix completion
externalUrl: https://github.com/KennethJAllen/data-completion-research
tech: [Python, Linear Algebra, Optimization]
order: 50
---

Matrix and tensor completion is the problem of filling in the missing entries of a partially observed array — the mathematics behind recommender systems, image inpainting, and sensor data recovery. When the underlying data is (approximately) low-rank, a small fraction of observed entries can be enough to reconstruct the whole thing.

This repository contains research code for low-rank matrix and tensor completion, connected to my [PhD dissertation](/papers/dissertation/) on geometric approaches to the completion problem. The image above shows a demonstration: a portrait reconstructed from a sparse set of observed pixels using low-rank completion.

See the [repository](https://github.com/KennethJAllen/data-completion-research) for the algorithms and experiments.
