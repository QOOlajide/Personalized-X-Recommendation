# Project Context

<!-- This file describes the current project. Update per project. -->

For this project, you are tasked with building a personalized reimplementation of the X recommendation algorithm, based on the components recently open sourced by the X engineering team [USE PERPLEXITY TO CHECK ONLINE AND CONFIRM WHAT I MEAN]. The system should expose the full ranking pipeline as a tunable, inspectable, and user-programmable engine, allowing you to experiment with how timelines, trends, and virality emerge under different algorithmic preferences.

Project Requirements:

Implement an end-to-end ranking pipeline inspired by X’s open-sourced architecture
Build a preference-driven personalization layer that allows users to tune the algorithm using explicit controls (e.g., recency vs popularity, friends vs global, niche vs viral, tech vs politics vs culture).
Create a synthetic social network seeded by LLM-generated personas (e.g., founders, journalists, meme accounts, traders, politicians), each with distinct writing styles, interests, and behavioral models. The system should generate tweets, threads, replies, quote tweets, and engagement that resemble real X dynamics.
Develop a full-stack web application that mirrors the X experience, including home feed, profiles, follow graph, likes, reposts, replies, trends, and notifications. The feed should be powered entirely by your ranking engine and update live as preferences and engagement change.
Challenges:

Balancing engagement optimization with diversity, freshness, and exploration to prevent filter bubbles, topic saturation, and popularity feedback loops inside the simulation.
Designing realistic social dynamics and engagement cascades using LLM agents while preventing malicious behavior 0r spammy content.
Ensuring the ranking system is auditable and explainable, with clear attribution of why each tweet appears in a feed and how changes in algorithmic weights shift global discourse patterns.