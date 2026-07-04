---
title: Alternating Turn Analysis
summary: Analyzing whether drivers alternate turn direction more often than chance while navigating cities.
image: ../../assets/images/turn_sequence.png
imageAlt: Turn sequence diagram
externalUrl: https://github.com/KennethJAllen/turn-sequence
tech: [Python, Google Maps APIs, Google Sheets]
order: 60
---

If you're taking a left turn and don't know which way you'll turn next, which lane should you choose? The hypothesis: the outermost lane is optimal on average, since real-world routes tend to overcorrect toward their destination, alternating between left and right turns more often than repeating the same direction.

This project tests that hypothesis by sampling grid points across cities, routing between every pair with the Google Routes API, and measuring how often consecutive turns alternate direction versus repeat. Across roughly 34,000 routes in 15 cities, alternating turns occurred 52.6% of the time on average — a modest but consistent tilt above the 50% chance baseline, with notable variation by city (Berlin at 60.7%, London at 43.3%).

See the [repository](https://github.com/KennethJAllen/turn-sequence) for the full methodology, per-city results, and analysis code.
