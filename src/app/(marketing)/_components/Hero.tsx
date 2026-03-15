'use client';

import Link from 'next/link';
import { FaGithub } from 'react-icons/fa';
import { motion } from 'motion/react';
import { LogoIcon } from '../../../components/LogoIcon';

/* ------------------------------------------------------------------ */
/*  Shared animation tokens                                           */
/* ------------------------------------------------------------------ */
const fadeUp = { opacity: 0, y: 8 };
const visible = { opacity: 1, y: 0 };
const transition = { duration: 0.6, ease: [0.4, 0, 0.2, 1] as const };

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
type HeroProps = {
  githubUrl: string;
};

export function Hero({ githubUrl }: HeroProps) {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-20 sm:py-24 lg:py-28">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10 lg:gap-16">
          {/* Left: copy */}
          <motion.div
            className="flex flex-col gap-6 max-w-xl"
            initial={fadeUp}
            animate={visible}
            transition={transition}
          >
            {/* Logo + app name */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 border border-border">
                <LogoIcon size={20} style="3d" showBackground={false} />
              </div>
              <div>
                <p className="text-sm font-medium">Shift</p>
                <p className="text-xs text-muted-foreground">
                  Open-source algorithmic feed
                </p>
              </div>
            </div>

            {/* Headline */}
            <h1 className="max-w-[20ch] text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight">
              Take control of your feed.
            </h1>

            {/* Subheadline */}
            <p className="max-w-lg text-sm sm:text-base text-muted-foreground">
              Shift is an open-source, X-style feed where the recommendation
              algorithm is fully exposed, explainable, and user-tunable—no black
              boxes, just sliders and signals you can inspect.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3">
              <Link
                href="/feed"
                className="inline-flex items-center justify-center rounded-full bg-primary px-4 sm:px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 active:bg-primary/80 transition-colors duration-150"
              >
                Try the feed
              </Link>
              <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-transparent px-4 sm:px-5 py-2.5 text-sm font-medium text-foreground hover:bg-zinc-900 active:bg-zinc-800 transition-colors duration-150"
              >
                <FaGithub size={16} />
                View on GitHub
              </a>
            </div>

            {/* Meta */}
            <p className="text-xs text-muted-foreground">
              No real accounts. 500 synthetic personas only.
            </p>
          </motion.div>

          {/* Right: ranking controls preview card */}
          <motion.div
            className="w-full lg:w-[420px] shrink-0"
            initial={fadeUp}
            animate={visible}
            transition={{ ...transition, delay: 0.2 }}
            whileHover={{ y: -4, transition: { duration: 0.2, ease: 'easeOut' } }}
          >
            <div className="rounded-2xl border border-border bg-zinc-950/60 shadow-[0_0_0_1px_rgba(15,23,42,0.6)]">
              {/* Card header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-xs font-medium text-muted-foreground">
                  Ranking controls
                </span>
                <span className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary">
                  Live
                </span>
              </div>

              {/* Card body */}
              <div className="p-4 space-y-3 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Recentness</span>
                  <span className="text-foreground font-medium">+0.8</span>
                </div>
                <div className="flex justify-between">
                  <span>Author similarity</span>
                  <span className="text-foreground font-medium">+0.3</span>
                </div>
                <div className="flex justify-between">
                  <span>Controversy</span>
                  <span className="text-foreground font-medium">−0.2</span>
                </div>

                {/* Card footer */}
                <p className="pt-2 text-[11px] border-t border-border">
                  &ldquo;Why this post?&rdquo; shows exactly which weights and
                  signals pushed it into your feed.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
