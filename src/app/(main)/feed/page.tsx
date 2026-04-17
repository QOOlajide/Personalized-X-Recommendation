import { auth } from '@clerk/nextjs/server';
import {
  MessageCircle,
  Repeat2,
  Heart,
  BarChart2,
  Share,
  MoreHorizontal,
} from 'lucide-react';
import { getFeedForUser } from '../../../services/feed/get-feed';
import { formatRelativeTime, formatCompactNumber } from '../../../lib/utils';
import type { FeedItem } from '../../../services/feed/get-feed';

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export default async function FeedPage() {
  const { userId, redirectToSignIn } = await auth();

  if (!userId) {
    return redirectToSignIn({ returnBackUrl: '/feed' });
  }

  let items: FeedItem[] = [];
  let error: string | null = null;

  try {
    const response = await getFeedForUser(userId);
    items = response.items;
  } catch (e) {
    console.error('[feed] ranking pipeline failed:', e);
    error = 'Something went wrong loading your feed. Please try again later.';
  }

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

      {/* Error state */}
      {error && (
        <div className="border-b border-border px-4 py-8 text-center">
          <p className="text-[15px] text-muted-foreground">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!error && items.length === 0 && (
        <div className="border-b border-border px-4 py-12 text-center">
          <h2 className="text-[17px] font-bold">Your feed is empty</h2>
          <p className="mt-1 text-[15px] text-muted-foreground">
            The database hasn&apos;t been seeded yet, or there are no posts to rank.
            Run the seed scripts to populate the synthetic network.
          </p>
        </div>
      )}

      {/* Timeline */}
      {items.length > 0 && (
        <section aria-label="Timeline">
          {items.map((post) => (
            <article
              key={post.id}
              className="flex gap-3 border-b border-border px-4 py-3 transition-colors hover:bg-accent/30"
            >
              {/* Avatar */}
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-[15px] font-semibold">
                {getInitials(post.author.name)}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[15px]">
                    <span className="cursor-pointer font-bold hover:underline">
                      {post.author.name}
                    </span>
                    <span className="text-muted-foreground">
                      @{post.author.handle}
                    </span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">
                      {formatRelativeTime(post.createdAt)}
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

                {/* Ranking hint */}
                <div className="mt-1 text-[12px] text-muted-foreground/60">
                  {post.source === 'in_network' ? 'From your network' : 'Suggested'} · {post.primaryReason}
                </div>

                {/* Engagement row */}
                <div className="mt-2 flex max-w-[425px] justify-between text-muted-foreground">
                  <button
                    type="button"
                    className="group inline-flex items-center gap-1 rounded-full px-2 py-1 transition-colors hover:bg-primary/10 hover:text-primary"
                  >
                    <MessageCircle className="h-4 w-4 transition-colors group-hover:text-primary" />
                    <span className="text-[13px]">{formatCompactNumber(post.replyCount)}</span>
                  </button>

                  <button
                    type="button"
                    className="group inline-flex items-center gap-1 rounded-full px-2 py-1 transition-colors hover:bg-emerald-500/10 hover:text-emerald-500"
                  >
                    <Repeat2 className="h-4 w-4 transition-colors group-hover:text-emerald-500" />
                    <span className="text-[13px]">{formatCompactNumber(post.repostCount)}</span>
                  </button>

                  <button
                    type="button"
                    className="group inline-flex items-center gap-1 rounded-full px-2 py-1 transition-colors hover:bg-pink-500/10 hover:text-pink-500"
                  >
                    <Heart className="h-4 w-4 transition-colors group-hover:text-pink-500" />
                    <span className="text-[13px]">{formatCompactNumber(post.likeCount)}</span>
                  </button>

                  <button
                    type="button"
                    className="group inline-flex items-center gap-1 rounded-full px-2 py-1 transition-colors hover:bg-primary/10 hover:text-primary"
                  >
                    <BarChart2 className="h-4 w-4 transition-colors group-hover:text-primary" />
                    <span className="text-[13px]">{formatCompactNumber(post.viewCount)}</span>
                  </button>

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
      )}

      {/* End of feed */}
      {items.length > 0 && (
        <div className="border-t border-border px-4 py-8 text-center text-[13px] text-muted-foreground">
          You&apos;re all caught up
        </div>
      )}
    </>
  );
}
