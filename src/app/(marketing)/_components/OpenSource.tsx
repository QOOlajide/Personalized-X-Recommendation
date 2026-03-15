import { FaGithub } from 'react-icons/fa';

type OpenSourceProps = {
  githubUrl: string;
};

export function OpenSource({ githubUrl }: OpenSourceProps) {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center">
        <h2 className="text-xl sm:text-2xl font-semibold">
          Built in the open.
        </h2>
        <p className="mt-3 mx-auto max-w-lg text-sm sm:text-base text-muted-foreground">
          Shift&apos;s ranking code, personas, and UI are fully open source.
          Inspect the scoring functions, tweak the weights, and fork the
          project.
        </p>
        <div className="mt-6">
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
