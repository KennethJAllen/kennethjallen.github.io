---
title: CUR Dynamic Mode Decomposition
summary: Dynamic mode decomposition using CUR matrix approximation for large-scale data.
image: ../../assets/images/dmd-poster.png
imageAlt: Dynamic mode decomposition animation
externalUrl: https://github.com/KennethJAllen/dynamic-mode-decomposition
video: /media/dmd
tech: [Python, NumPy, Numerical Analysis]
order: 40
---

Dynamic mode decomposition (DMD) extracts the dominant spatiotemporal modes from high-dimensional time-series data — the coherent structures that govern how a system evolves over time. It is widely used for fluid flows, video, and other measurement data where the dynamics are approximately linear in a suitable basis.

Standard DMD relies on the singular value decomposition, which becomes expensive as data grows. This project replaces the SVD step with a **CUR approximation**, which builds a low-rank factorization from a well-chosen subset of actual rows and columns of the data matrix. That reduces the computational cost on large-scale data, and keeps the factors interpretable — they are made of real measurements rather than abstract linear combinations.

The repository contains a NumPy implementation with examples of extracting and reconstructing dynamic modes from data. See the [source code on GitHub](https://github.com/KennethJAllen/dynamic-mode-decomposition).
