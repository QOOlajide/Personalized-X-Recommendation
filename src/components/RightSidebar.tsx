import { Search } from 'lucide-react';

const TRENDING_ITEMS = [
  { category: 'Technology · Trending', title: 'Recommendation Systems', posts: '12.4K posts' },
  { category: 'AI · Trending', title: 'Ranking Algorithms', posts: '8.2K posts' },
  { category: 'Trending in Tech', title: 'Feed Personalization', posts: '5.1K posts' },
  { category: 'Machine Learning · Trending', title: 'Content Discovery', posts: '3.7K posts' },
];

const SUGGESTED_FOLLOWS = [
  { name: 'Ada Lovelace', handle: '@ada_rec_sys', initials: 'AL' },
  { name: 'Linus Torvalds', handle: '@linus_kernel', initials: 'LT' },
  { name: 'Grace Hopper', handle: '@grace_compilers', initials: 'GH' },
];

export function RightSidebar() {
  return (
    <aside className="sticky top-0 flex h-screen flex-col gap-4 overflow-y-auto px-6 py-3">
      {/* Search bar */}
      <div className="sticky top-0 bg-background pb-3 pt-1">
        <div className="flex items-center gap-3 rounded-full bg-muted px-4 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <span className="text-[15px] text-muted-foreground">Search</span>
        </div>
      </div>

      {/* What's happening */}
      <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3">
        <h2 className="mb-3 text-[20px] font-bold">What&apos;s happening</h2>
        <div className="flex flex-col">
          {TRENDING_ITEMS.map((item) => (
            <div
              key={item.title}
              className="cursor-pointer rounded-md px-1 py-3 transition-colors hover:bg-accent"
            >
              <p className="text-[13px] text-muted-foreground">
                {item.category}
              </p>
              <p className="text-[15px] font-bold">{item.title}</p>
              <p className="text-[13px] text-muted-foreground">{item.posts}</p>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="mt-2 text-[15px] text-primary hover:underline"
        >
          Show more
        </button>
      </div>

      {/* Who to follow */}
      <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3">
        <h2 className="mb-3 text-[20px] font-bold">Who to follow</h2>
        <div className="flex flex-col">
          {SUGGESTED_FOLLOWS.map((user) => (
            <div
              key={user.handle}
              className="flex items-center gap-3 rounded-md px-1 py-3 transition-colors hover:bg-accent"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                {user.initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-bold hover:underline cursor-pointer">
                  {user.name}
                </p>
                <p className="truncate text-[13px] text-muted-foreground">
                  {user.handle}
                </p>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-full bg-foreground px-4 py-1.5 text-[13px] font-bold text-background transition-colors hover:opacity-90"
              >
                Follow
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="mt-2 text-[15px] text-primary hover:underline"
        >
          Show more
        </button>
      </div>

      {/* Footer links */}
      <div className="px-1 pb-4 text-[13px] text-muted-foreground">
        <p>Shift — Personalized feed with tunable ranking</p>
      </div>
    </aside>
  );
}
