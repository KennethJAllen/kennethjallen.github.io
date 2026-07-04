---
title: YGO Small World
summary: Graph-theoretic analysis of the Yu-Gi-Oh! card "Small World".
image: ../../assets/images/small-world.png
imageAlt: Small World card bridge graph
externalUrl: https://github.com/KennethJAllen/YGO-small-world
tech: [Python, Graph Theory, NetworkX]
order: 20
---

The Yu-Gi-Oh! card **Small World** can search any monster out of the deck — but only through a "bridge": an intermediate card that shares exactly one property (attack, defense, level, type, or attribute) with both the card you reveal and the card you want. Whether a given card can reach another depends entirely on the composition of the deck, which makes building around Small World a genuinely combinatorial problem.

This project models the mechanic as a graph. Each monster is a node, and two monsters are connected by an edge when they share exactly one property, so "can Small World turn card A into card B?" becomes a path-finding question. Building the graph with NetworkX makes it possible to compute which cards are reachable from which, identify the strongest bridge cards for a given deck, and see how adding or removing a single card changes the deck's overall connectivity.

The result is a practical deck-building optimization tool grounded in graph theory. Source code and examples are in the [repository](https://github.com/KennethJAllen/YGO-small-world).
