---
title: Santorini Multi-Agent RL
summary: AlphaZero self-play reinforcement learning for the board game Santorini, playable in-browser.
image: ../../assets/images/santorini.png
imageAlt: Santorini board game
externalUrl: https://github.com/KennethJAllen/santorini
demoUrl: /santorini/
tech: [Python, PyTorch, AlphaZero, MCTS, TypeScript, ONNX Runtime Web]
order: 30
---

Santorini is a two-player abstract strategy game played on a 5×5 grid: each turn you move a builder and construct a level of a tower, and the first player to step onto a third-level tower wins. The rules are simple, but the game tree is deep — which makes it a great testbed for reinforcement learning.

The AI is trained AlphaZero-style in PyTorch: a residual convolutional network learns policy and value purely from self-play games, guided by Monte Carlo tree search, with new networks gated against the current best before being accepted. The trained network is exported to ONNX and runs fully client-side with ONNX Runtime Web — the game engine and MCTS are ported to TypeScript, so the demo needs no server and searches happen right in your browser.

[Play against it in your browser](/santorini/), or browse the [source code on GitHub](https://github.com/KennethJAllen/santorini) for the game engine, environment, and training code.
