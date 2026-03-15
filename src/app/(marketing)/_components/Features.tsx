'use client';

import { FaSlidersH, FaQuestionCircle, FaUsers, FaShieldAlt } from 'react-icons/fa';
import { motion } from 'motion/react';
import type { IconType } from 'react-icons';

/* ------------------------------------------------------------------ */
/*  Shared animation tokens                                           */
/* ------------------------------------------------------------------ */
const fadeUp = { opacity: 0, y: 8 };
const visible = { opacity: 1, y: 0 };
const transition = { duration: 0.6, ease: [0.4, 0, 0.2, 1] as const };

/* ------------------------------------------------------------------ */
/*  Data                                                              */
/* ------------------------------------------------------------------ */
type Feature = {
  icon: IconType;
  title: string;
  description: string;
};

const FEATURES: Feature[] = [
  {
    icon: FaSlidersH,
    title: 'Real-time ranking sliders',
    description:
      'Adjust weights like recency, author similarity, and engagement in real time, then watch the feed re-rank instantly based on your preferences.',
  },
  {
    icon: FaQuestionCircle,
    title: '"Why this post?" for every item',
    description:
      'Inspect a per-post breakdown of the signals and scoring steps that surfaced it, from follow graph distance to predicted engagement.',
  },
  {
    icon: FaUsers,
    title: '500 synthetic personas',
    description:
      'Explore a fully simulated network of accounts and posts, so you can experiment with ranking strategies without touching real user data.',
  },
  {
    icon: FaShieldAlt,
    title: 'Anti-filter-bubble constraints',
    description:
      'Built-in diversity rules cap over-personalization and inject contrasting viewpoints, so you can see how feed quality changes when you push against echo chambers.',
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
export function Features() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Intro */}
        <motion.div
          className="max-w-2xl space-y-2 mb-8"
          initial={fadeUp}
          whileInView={visible}
          viewport={{ once: true }}
          transition={transition}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            Features
          </p>
          <h2 className="text-xl sm:text-2xl font-semibold">
            Built to make the algorithm legible.
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Every control in Shift connects directly to the ranking code, so you
            can see how changing weights changes what you see in the feed.
          </p>
        </motion.div>

        {/* Feature cards */}
        <div className="grid gap-6 sm:grid-cols-2">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              className="relative flex flex-col gap-3 rounded-2xl border border-border bg-zinc-950/60 p-5 sm:p-6 hover:border-primary/60 transition-colors duration-150"
              initial={fadeUp}
              whileInView={visible}
              viewport={{ once: true }}
              transition={{ ...transition, delay: i * 0.1 }}
              whileHover={{ y: -4, transition: { duration: 0.2, ease: 'easeOut' } }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <feature.icon size={16} />
              </div>
              <h3 className="text-sm font-medium">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
