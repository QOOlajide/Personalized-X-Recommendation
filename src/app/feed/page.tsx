import { auth } from '@clerk/nextjs/server';

type MockPost = {
  id: string;
  authorName: string;
  authorHandle: string;
  avatarInitials: string;
  timestamp: string;
  content: string;
  replies: number;
  reposts: number;
  likes: number;
  views: string;
};

const MOCK_FEED: MockPost[] = [
  {
    id: '1',
    authorName: 'Ada Lovelace',
    authorHandle: '@ada_rec_sys',
    avatarInitials: 'AL',
    timestamp: '2h',
    content:
      'Just shipped a new ranking experiment that boosts niche-but-high-engagement topics. Curious to see how it impacts long-tail discovery.',
    replies: 12,
    reposts: 34,
    likes: 210,
    views: '12.4K',
  },
  {
    id: '2',
    authorName: 'Linus Torvalds',
    authorHandle: '@linus_kernel',
    avatarInitials: 'LT',
    timestamp: '4h',
    content:
      'Hot take: relevance is not enough. A good feed should feel *coherent* over a session, not like random high-CTR noise.',
    replies: 54,
    reposts: 91,
    likes: 642,
    views: '38.9K',
  },
  {
    id: '3',
    authorName: 'Grace Hopper',
    authorHandle: '@grace_compilers',
    avatarInitials: 'GH',
    timestamp: '6h',
    content:
      'Your ranking model is only as good as your feedback signals. Track skips, dwell time, returns-to-tweet, and negative feedback, not just likes.',
    replies: 9,
    reposts: 27,
    likes: 301,
    views: '18.1K',
  },
];

export default async function FeedPage() {
  const { userId, redirectToSignIn } = await auth();

  if (!userId) {
    return redirectToSignIn({ returnBackUrl: '/feed' });
  }

  const feed = MOCK_FEED;

  return (
    <div className="flex min-h-screen justify-center bg-background text-foreground">
      <div className="flex w-full max-w-3xl border-x border-border">
        <main className="flex-1">
          {/* Top bar */}
          <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex flex-col">
                <h1 className="text-lg font-semibold">Home</h1>
                <span className="text-xs text-muted-foreground">
                  For you · Personalized
                </span>
              </div>
            </div>
          </header>

          {/* Composer placeholder */}
          <section className="border-b border-border px-4 py-3">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                U
              </div>
              <div className="flex-1">
                <div className="text-sm text-muted-foreground">
                  What&apos;s happening?
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    Composer coming soon
                  </div>
                  <button
                    type="button"
                    className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                    disabled
                  >
                    Post
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Timeline */}
          <section aria-label="Timeline" className="divide-y divide-border">
            {feed.map((post) => (
              <article key={post.id} className="flex gap-3 px-4 py-3">
                {/* Avatar */}
                <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                  {post.avatarInitials}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <header className="flex items-center gap-1 text-sm">
                    <span className="font-semibold hover:underline cursor-pointer">
                      {post.authorName}
                    </span>
                    <span className="text-muted-foreground">
                      {post.authorHandle}
                    </span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">
                      {post.timestamp}
                    </span>
                  </header>

                  <div className="mt-1 text-sm leading-relaxed">
                    {post.content}
                  </div>

                  {/* Engagement row */}
                  <footer className="mt-2 flex max-w-md justify-between text-xs text-muted-foreground">
                    <button
                      type="button"
                      className="flex items-center gap-2 hover:text-sky-500"
                    >
                      <span className="h-4 w-4 rounded-full border border-current" />
                      <span>{post.replies}</span>
                    </button>
                    <button
                      type="button"
                      className="flex items-center gap-2 hover:text-emerald-500"
                    >
                      <span className="h-4 w-4 rounded-full border border-current" />
                      <span>{post.reposts}</span>
                    </button>
                    <button
                      type="button"
                      className="flex items-center gap-2 hover:text-pink-500"
                    >
                      <span className="h-4 w-4 rounded-full border border-current" />
                      <span>{post.likes}</span>
                    </button>
                    <button
                      type="button"
                      className="flex items-center gap-2 hover:text-slate-500"
                    >
                      <span className="h-4 w-4 rounded-sm border border-current" />
                      <span>{post.views}</span>
                    </button>
                  </footer>
                </div>
              </article>
            ))}
          </section>

          {/* End of feed */}
          <div className="border-t border-border px-4 py-6 text-center text-xs text-muted-foreground">
            You&apos;re all caught up — ranking service integration coming soon.
          </div>
        </main>
      </div>
    </div>
  );
}
