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
            className="post-icon-action post-action--sky"
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
            className="post-action post-action--sky inline-flex items-center gap-1 rounded-full px-2 py-1 text-[13px]"
          >
            <MessageCircle className="h-4 w-4" />
            <span>{formatCompactNumber(post.replyCount)}</span>
          </button>

          <button
            type="button"
            aria-label={`${formatCompactNumber(post.repostCount)} reposts`}
            className="post-action post-action--emerald inline-flex items-center gap-1 rounded-full px-2 py-1 text-[13px]"
          >
            <Repeat2 className="h-4 w-4" />
            <span>{formatCompactNumber(post.repostCount)}</span>
          </button>

          <button
            type="button"
            aria-label={`${formatCompactNumber(post.likeCount)} likes`}
            className="post-action post-action--pink inline-flex items-center gap-1 rounded-full px-2 py-1 text-[13px]"
          >
            <Heart className="h-4 w-4" />
            <span>{formatCompactNumber(post.likeCount)}</span>
          </button>

          <button
            type="button"
            aria-label={`${formatCompactNumber(post.viewCount)} views`}
            className="post-action post-action--sky inline-flex items-center gap-1 rounded-full px-2 py-1 text-[13px]"
          >
            <BarChart2 className="h-4 w-4" />
            <span>{formatCompactNumber(post.viewCount)}</span>
          </button>

          <button
            type="button"
            aria-label="Share post"
            className="post-icon-action post-action--sky"
          >
            <Share className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}
