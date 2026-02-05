# Project Kickoff

<!-- After reviewing Context.md, start here -->

I’m starting a new project and want to approach it strategically, like a senior software engineer.
Use the following workflow:
Clarify and structure requirements
Read the project description and restate all requirements and constraints in your own words.
Break them down into clear, numbered functional and non-functional requirements.
Highlight any implicit challenges or open questions that I should resolve before implementation.
Map requirements to architecture and responsibilities
For each requirement, describe what the app will need to do (features, flows, and key data entities).
Propose a high-level architecture (front end, back end, database, caching, background processing, integrations, etc.).
Call out potential bottlenecks, data flows, and where we need strong reliability, security, and performance.
Recommend tech stack (with my preferences)
Propose a tech stack that fits the requirements, prioritizing tools I already use where appropriate:
PostgreSQL
TypeScript
Redis
React
Next.js
Python
FastAPI
Vercel
Zod
shadcn/ui
TailwindCSS
Alembic
Node.js
For each major part of the system (frontend, backend, data, infra), explain which technologies you recommend and why.
If you suggest alternatives, justify them and compare briefly to my usual tools.
Map requirements to tools and components
For every requirement, explicitly list which language, framework, or tool will be used (e.g., “Requirement X → Next.js + React + Zod on the client, FastAPI + PostgreSQL on the server, Redis for caching”).
Identify cross-cutting concerns such as authentication, authorization, validation, logging, and monitoring and where they will live.
Implementation plan (end-to-end, but manageable)
Provide a step-by-step implementation plan from project setup to deployment.
Group steps into phases (e.g., “Project scaffolding”, “Core domain models & DB schema”, “API endpoints”, “Frontend pages/components”, “Integration & testing”, “Deployment & observability”).
Make each step small and concrete so Cursor can handle them without being overwhelmed.
For each phase, specify what files or modules will be created/modified.
Best practices, security, and robustness
Throughout your suggestions, adhere to best practices for the chosen stack (TypeScript/Next.js/React, FastAPI/Python, PostgreSQL, Redis, Vercel, Zod, shadcn/ui).
Call out important decisions related to:
Input validation and schema definition (Zod, Pydantic, etc.)
Error handling and edge cases
Security (auth, authorization, secrets, OWASP-style concerns)
Performance and scalability (caching, pagination, indexing, rate limiting where relevant).
When generating or modifying code, follow the quality rules defined in my cursor.txt (treat those as the coding standards and senior-engineer behavior to follow).
How to interact with me
Before generating code, confirm your understanding of the requirements and architecture and ask clarifying questions if anything is ambiguous.
Then, work iteratively: suggest which step we should tackle next, and generate focused code changes for that step only.
When you present code, include brief explanations of the reasoning behind key design decisions, especially where there were trade-offs.

Use this process every time we work on this project, unless I explicitly say otherwise.
