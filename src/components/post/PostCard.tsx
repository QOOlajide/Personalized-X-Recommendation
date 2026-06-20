import {
  MessageCircle,
  Repeat2,
  Heart,
  BarChart2,
  Share,
  MoreHorizontal,
} from 'lucide-react';
import { formatRelativeTime, formatCompactNumber } from '../../lib/utils';
import type { FeedItem } from '../../services/feed/get-feed';

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

/**
 * Renders a single post in the timeline.
 *
 * Accepts a FeedItem (the UI-ready shape from the data-access layer)
 * and renders author info, content, ranking hint, and engagement buttons.
 * Designed to be reused in feed, thread view, and profile pages.
 */
export function PostCard({ post }: { post: FeedItem }) {
  return (
    <article className="flex gap-3 border-b border-border px-4 py-3 transition-colors hover:bg-accent/30">
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
            <time
              className="text-muted-foreground"
              dateTime={post.createdAt.toISOString()}
            >
              {formatRelativeTime(post.createdAt)}
            </time>
          </div>
          <button
            type="button"
            aria-label="More options"
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
        <div
          className="mt-2 flex max-w-[425px] justify-between text-muted-foreground"
          role="group"
          aria-label="Post engagement actions"
        >
          <button
            type="button"
            aria-label={`${formatCompactNumber(post.replyCount)} replies`}
            className="group inline-flex items-center gap-1 rounded-full px-2 py-1 transition-colors hover:bg-primary/10 hover:text-primary"
          >
            <MessageCircle className="h-4 w-4 transition-colors group-hover:text-primary" />
            <span className="text-[13px]">{formatCompactNumber(post.replyCount)}</span>
          </button>

          <button
            type="button"
            aria-label={`${formatCompactNumber(post.repostCount)} reposts`}
            className="group inline-flex items-center gap-1 rounded-full px-2 py-1 transition-colors hover:bg-emerald-500/10 hover:text-emerald-500"
          >
            <Repeat2 className="h-4 w-4 transition-colors group-hover:text-emerald-500" />
            <span className="text-[13px]">{formatCompactNumber(post.repostCount)}</span>
          </button>

          <button
            type="button"
            aria-label={`${formatCompactNumber(post.likeCount)} likes`}
            className="group inline-flex items-center gap-1 rounded-full px-2 py-1 transition-colors hover:bg-pink-500/10 hover:text-pink-500"
          >
            <Heart className="h-4 w-4 transition-colors group-hover:text-pink-500" />
            <span className="text-[13px]">{formatCompactNumber(post.likeCount)}</span>
          </button>

          <button
            type="button"
            aria-label={`${formatCompactNumber(post.viewCount)} views`}
            className="group inline-flex items-center gap-1 rounded-full px-2 py-1 transition-colors hover:bg-primary/10 hover:text-primary"
          >
            <BarChart2 className="h-4 w-4 transition-colors group-hover:text-primary" />
            <span className="text-[13px]">{formatCompactNumber(post.viewCount)}</span>
          </button>

          <button
            type="button"
            aria-label="Share post"
            className="rounded-full p-1 transition-colors hover:bg-primary/10 hover:text-primary"
          >
            <Share className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}
