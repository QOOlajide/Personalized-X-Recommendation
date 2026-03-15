import Link from 'next/link';
import { FaGithub } from 'react-icons/fa';

type FinalCtaProps = {
  githubUrl: string;
};

export function FinalCta({ githubUrl }: FinalCtaProps) {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="max-w-[20ch] text-xl sm:text-2xl font-semibold">
          A transparent social feed, ready to inspect.
        </h2>
        <div className="flex flex-wrap items-center gap-3">
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
      </div>
    </section>
  );
}
