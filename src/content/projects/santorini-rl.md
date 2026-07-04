---
title: Santorini Multi-Agent RL
summary: Multi-agent reinforcement learning for the board game Santorini, playable in-browser.
image: ../../assets/images/santorini.png
imageAlt: Santorini board game
externalUrl: https://github.com/KennethJAllen/santorini
demoUrl: /santorini/
tech: [Python, PyTorch, Reinforcement Learning, Pygbag]
order: 30
---

Santorini is a two-player abstract strategy game played on a 5×5 grid: each turn you move a builder and construct a level of a tower, and the first player to step onto a third-level tower wins. The rules are simple, but the game tree is deep — which makes it a great testbed for reinforcement learning.

This project implements the full game as a multi-agent reinforcement learning environment, with agents trained in PyTorch. Beyond the training environment, the game is fully playable: the Python implementation is compiled to WebAssembly with Pygbag, so it runs directly in the browser with no installation.

[Play it in your browser](/santorini/), or browse the [source code on GitHub](https://github.com/KennethJAllen/santorini) for the game engine, environment, and training code.
