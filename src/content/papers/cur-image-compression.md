---
title: Maximal Volume Matrix Cross Approximation for Image Compression and Least Squares Solution
summary: A maximal-volume CUR approach to matrix approximation with applications to image compression.
image: ../../assets/images/cur_img_compression.png
imageAlt: House reconstructed via CUR decomposition, comparing maxvol and arbitrary submatrix selection
url: https://arxiv.org/abs/2309.17403
venue: arXiv
order: 10
---

Matrix cross (CUR) approximation compresses a matrix by keeping only a subset of its actual rows and columns. The quality of the approximation hinges on *which* rows and columns are chosen — a poor selection can be arbitrarily bad, while a good one comes provably close to the best possible low-rank approximation.

This paper studies the **maximal volume** criterion for that selection: choosing the intersection submatrix so that its determinant is as large as possible in absolute value. We develop the approximation theory around the maximal-volume choice and demonstrate it on image compression, where the difference between maxvol-selected and arbitrarily selected submatrices is visible directly in the reconstructed images, as well as on least squares solutions.

[Read the paper on arXiv](https://arxiv.org/abs/2309.17403).
