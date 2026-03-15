type PostHeaderProps = {
  authorName: string;
  authorHandle: string;
  createdAt: string; // e.g. "2h" or a formatted string
};

export function PostHeader({ authorName, authorHandle, createdAt }: PostHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-2">
      {/* Left: name + handle + time */}
      <div className="flex min-w-0 flex-col">
        <div className="flex items-center gap-1 text-sm">
          <span className="font-semibold truncate">{authorName}</span>
          <span className="text-muted-foreground">@{authorHandle}</span>
          <span className="text-muted-foreground">· {createdAt}</span>
        </div>
      </div>

      {/* Right: actions (Grok / more) */}
      <div className="flex items-center gap-1">
        {/* Replace with whatever actions you want */}
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
          aria-label="Algorithm actions"
        >
          {/* icon placeholder */}
          ⋯
        </button>
      </div>
    </div>
  );
}

type PostCardProps = {
  authorName: string;
  authorHandle: string;
  createdAt: string;
  content: string;
  // later: stats, media, explainability, etc.
};

export function PostCard(props: PostCardProps) {
  return (
    <article className="flex gap-3 border-b border-border px-4 py-3">
      {/* Avatar column */}
      <div className="mt-1">
        {/* shadcn Avatar goes here */}
        <div className="h-10 w-10 rounded-full bg-muted" />
      </div>

      {/* Main column */}
      <div className="flex-1 min-w-0">
        <PostHeader
          authorName={props.authorName}
          authorHandle={props.authorHandle}
          createdAt={props.createdAt}
        />

        <div className="mt-2 text-sm whitespace-pre-wrap">
          {props.content}
        </div>

        {/* TODO: actions row, "Why am I seeing this?" trigger */}
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <button className="hover:text-primary">Reply</button>
          <button className="hover:text-primary">Repost</button>
          <button className="hover:text-primary">Like</button>
          <button className="hover:text-primary">Why this post?</button>
        </div>
      </div>
    </article>
  );
}
