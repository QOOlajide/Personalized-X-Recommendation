import { auth } from '@clerk/nextjs/server';
import {
  MessageCircle,
  Repeat2,
  Heart,
  BarChart2,
  Share,
  MoreHorizontal,
} from 'lucide-react';

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
  {
    id: '4',
    authorName: 'Alan Turing',
    authorHandle: '@turing_complete',
    avatarInitials: 'AT',
    timestamp: '8h',
    content:
      'The best recommendation systems don\'t just show you what you\'ll click — they help you discover what you didn\'t know you\'d love.',
    replies: 31,
    reposts: 67,
    likes: 489,
    views: '24.7K',
  },
  {
    id: '5',
    authorName: 'Margaret Hamilton',
    authorHandle: '@mhamilton_sw',
    avatarInitials: 'MH',
    timestamp: '12h',
    content:
      'Error handling in ranking pipelines is underrated. What happens when your scoring service times out? Degrade gracefully or show nothing?',
    replies: 18,
    reposts: 42,
    likes: 276,
    views: '15.3K',
  },
];

export default async function FeedPage() {
  const { userId, redirectToSignIn } = await auth();

  if (!userId) {
    return redirectToSignIn({ returnBackUrl: '/feed' });
  }

  const feed = MOCK_FEED;

  return (
    <>
      {/* Sticky header */}
      <header className="sticky top-0 z-30 flex h-[53px] items-center border-b border-border bg-background/80 px-4 backdrop-blur">
        <div className="flex flex-col">
          <h1 className="text-[17px] font-bold leading-tight">Home</h1>
          <span className="text-[13px] text-muted-foreground">
            For you · Personalized
          </span>
        </div>
      </header>

      {/* Composer placeholder */}
      <section className="border-b border-border px-4 py-3">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
            U
          </div>
          <div className="flex-1">
            <div className="text-[15px] text-muted-foreground">
              What&apos;s happening?
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="text-[13px] text-muted-foreground">
                Composer coming soon
              </div>
              <button
                type="button"
                className="rounded-full bg-primary px-4 py-1.5 text-[14px] font-bold text-primary-foreground disabled:opacity-50"
                disabled
              >
                Post
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section aria-label="Timeline">
        {feed.map((post) => (
          <article
            key={post.id}
            className="flex gap-3 border-b border-border px-4 py-3 transition-colors hover:bg-accent/30"
          >
            {/* Avatar */}
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-[15px] font-semibold">
              {post.avatarInitials}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              {/* Header row: name, handle, timestamp, more */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[15px]">
                  <span className="cursor-pointer font-bold hover:underline">
                    {post.authorName}
                  </span>
                  <span className="text-muted-foreground">
                    {post.authorHandle}
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">
                    {post.timestamp}
                  </span>
                </div>
                <button
                  type="button"
                  className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="mt-0.5 text-[15px] leading-snug">
                {post.content}
              </div>

              {/* Engagement row */}
              <div className="mt-2 flex max-w-[425px] justify-between text-muted-foreground">
                {/* Reply */}
                <button
                  type="button"
                  className="group inline-flex items-center gap-1 rounded-full px-2 py-1 transition-colors hover:bg-primary/10 hover:text-primary"
                >
                  <MessageCircle className="h-4 w-4 transition-colors group-hover:text-primary" />
                  <span className="text-[13px]">{post.replies}</span>
                </button>

                {/* Repost */}
                <button
                  type="button"
                  className="group inline-flex items-center gap-1 rounded-full px-2 py-1 transition-colors hover:bg-emerald-500/10 hover:text-emerald-500"
                >
                  <Repeat2 className="h-4 w-4 transition-colors group-hover:text-emerald-500" />
                  <span className="text-[13px]">{post.reposts}</span>
                </button>

                {/* Like */}
                <button
                  type="button"
                  className="group inline-flex items-center gap-1 rounded-full px-2 py-1 transition-colors hover:bg-pink-500/10 hover:text-pink-500"
                >
                  <Heart className="h-4 w-4 transition-colors group-hover:text-pink-500" />
                  <span className="text-[13px]">{post.likes}</span>
                </button>

                {/* Views */}
                <button
                  type="button"
                  className="group inline-flex items-center gap-1 rounded-full px-2 py-1 transition-colors hover:bg-primary/10 hover:text-primary"
                >
                  <BarChart2 className="h-4 w-4 transition-colors group-hover:text-primary" />
                  <span className="text-[13px]">{post.views}</span>
                </button>

                {/* Share */}
                <button
                  type="button"
                  className="rounded-full p-1 transition-colors hover:bg-primary/10 hover:text-primary"
                >
                  <Share className="h-4 w-4" />
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>

      {/* End of feed */}
      <div className="border-t border-border px-4 py-8 text-center text-[13px] text-muted-foreground">
        You&apos;re all caught up — ranking service integration coming soon.
      </div>
    </>
  );
}
