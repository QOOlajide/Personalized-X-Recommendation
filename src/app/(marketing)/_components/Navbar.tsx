import Link from 'next/link';
import { LogoIcon } from '../../../components/LogoIcon';

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
        {/* Left: Logo + name */}
        <Link href="/" className="flex items-center gap-2.5">
          <LogoIcon size={28} style="3d" showBackground={false} />
          <span className="text-sm font-semibold">Shift</span>
        </Link>

        {/* Right: Auth buttons */}
        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-150"
          >
            Log in
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 active:bg-primary/80 transition-colors duration-150"
          >
            Sign up
          </Link>
        </div>
      </div>
    </nav>
  );
}
