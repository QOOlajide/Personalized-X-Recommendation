'use client';

import { FaCode, FaFlask, FaGraduationCap } from 'react-icons/fa';
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
type AudienceCard = {
  icon: IconType;
  title: string;
  description: string;
};

const AUDIENCES: AudienceCard[] = [
  {
    icon: FaCode,
    title: 'For engineers',
    description:
      'Explore a real ranking pipeline with scoring functions, diversity heuristics, and explainability—all in TypeScript.',
  },
  {
    icon: FaFlask,
    title: 'For researchers',
    description:
      'Study how weight changes affect feed composition, filter bubbles, and content diversity in a controlled synthetic environment.',
  },
  {
    icon: FaGraduationCap,
    title: 'For students',
    description:
      'Learn how recommendation systems work by tuning one yourself—no ML background required.',
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
export function Audience() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid gap-6 sm:grid-cols-3">
          {AUDIENCES.map((audience, i) => (
            <motion.div
              key={audience.title}
              className="relative flex flex-col gap-3 rounded-2xl border border-border bg-zinc-950/60 p-5 sm:p-6 hover:border-primary/60 transition-colors duration-150"
              initial={fadeUp}
              whileInView={visible}
              viewport={{ once: true }}
              transition={{ ...transition, delay: i * 0.1 }}
              whileHover={{ y: -4, transition: { duration: 0.2, ease: 'easeOut' } }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <audience.icon size={16} />
              </div>
              <h3 className="text-sm font-medium">{audience.title}</h3>
              <p className="text-sm text-muted-foreground">
                {audience.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
