---
title: Kalman Filter
summary: Implementation and visualization of the Kalman filter for state estimation.
image: ../../assets/images/kalman.png
imageAlt: Kalman filter visualization
externalUrl: https://github.com/KennethJAllen/kalman-filter
tech: [Python, NumPy, Signal Processing]
order: 70
---

The Kalman filter is the workhorse of state estimation: given a stream of noisy measurements, it produces a statistically optimal estimate of a system's true underlying state by alternating between predicting the state forward in time and correcting that prediction with each new observation. It powers everything from GPS navigation to spacecraft guidance.

This project is a from-scratch NumPy implementation of the Kalman filter, with worked examples and visualizations showing how the filter tracks a system's state through noise — how the prediction and update steps interact, and how the estimate converges as observations accumulate.

See the [repository](https://github.com/KennethJAllen/kalman-filter) for the implementation and examples.
