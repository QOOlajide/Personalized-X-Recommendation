'use client';

import { motion } from 'motion/react';

/* ------------------------------------------------------------------ */
/*  Shared animation tokens                                           */
/* ------------------------------------------------------------------ */
const fadeUp = { opacity: 0, y: 8 };
const visible = { opacity: 1, y: 0 };
const transition = { duration: 0.6, ease: [0.4, 0, 0.2, 1] as const };

/* ------------------------------------------------------------------ */
/*  Data                                                              */
/* ------------------------------------------------------------------ */
type Step = {
  number: string;
  title: string;
  description: string;
};

const STEPS: Step[] = [
  {
    number: '1',
    title: 'Generate candidates',
    description:
      'Pull posts from followed accounts and topic-similar users.',
  },
  {
    number: '2',
    title: 'Score with weights',
    description:
      'Apply tunable factors: recency, engagement, similarity, and more.',
  },
  {
    number: '3',
    title: 'Apply diversity rules',
    description:
      'Cap author dominance, inject contrasting topics, enforce freshness.',
  },
  {
    number: '4',
    title: 'Render explainable feed',
    description:
      'Show ranked posts with per-item scoring breakdowns.',
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
export function HowItWorks() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          {/* Left: description */}
          <motion.div
            className="max-w-md space-y-3 shrink-0"
            initial={fadeUp}
            whileInView={visible}
            viewport={{ once: true }}
            transition={transition}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-primary">
              How Shift works
            </p>
            <h2 className="text-xl sm:text-2xl font-semibold">
              A transparent ranking pipeline you can inspect.
            </h2>
            <p className="text-sm text-muted-foreground">
              Shift&apos;s feed is a simple, modular stack: generate candidates
              from a synthetic network, score them with tunable weights, and
              apply diversity constraints before rendering.
            </p>
          </motion.div>

          {/* Right: pipeline steps */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.number}
                className="rounded-2xl border border-border bg-zinc-950/60 p-4 space-y-1.5 hover:border-primary/60 transition-colors duration-150"
                initial={fadeUp}
                whileInView={visible}
                viewport={{ once: true }}
                transition={{ ...transition, delay: i * 0.1 }}
                whileHover={{ y: -2, transition: { duration: 0.2, ease: 'easeOut' } }}
              >
                <p className="text-xs font-medium text-primary">
                  {step.number}.
                </p>
                <p className="text-sm font-medium">{step.title}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
