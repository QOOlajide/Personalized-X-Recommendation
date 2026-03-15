'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Search,
  Bell,
  Mail,
  User,
  Settings,
  Feather,
} from 'lucide-react';
import { UserButton } from '@clerk/nextjs';
import { LogoIcon } from './LogoIcon';

const NAV_ITEMS = [
  { href: '/feed', label: 'Home', icon: Home },
  { href: '/explore', label: 'Explore', icon: Search },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/messages', label: 'Messages', icon: Mail },
  { href: '/profile', label: 'Profile', icon: User },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function LeftSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen flex-col justify-between border-r border-border px-2 py-3 xl:px-3">
      {/* Top section: logo + nav + post */}
      <div className="flex flex-col">
        {/* Logo */}
        <Link
          href="/feed"
          className="mb-2 inline-flex items-center gap-3 self-start rounded-full p-3 transition-colors hover:bg-accent"
        >
          <LogoIcon size={28} style="3d" showBackground={false} />
          <span className="hidden text-xl font-bold xl:inline">Shift</span>
        </Link>

        {/* Navigation */}
        <nav className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-5 rounded-full px-3 py-3 transition-colors hover:bg-accent ${
                  isActive ? 'font-bold' : 'font-normal'
                }`}
              >
                <item.icon
                  className="h-[26px] w-[26px] shrink-0"
                  strokeWidth={isActive ? 2.5 : 1.75}
                />
                <span className="hidden text-[20px] xl:inline">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Post button — full width with text on xl */}
        <button
          type="button"
          className="mt-4 hidden h-[52px] w-full rounded-full bg-primary text-[17px] font-bold text-primary-foreground transition-colors hover:bg-primary/90 xl:block"
        >
          Post
        </button>

        {/* Post button — icon only on smaller sidebar */}
        <button
          type="button"
          className="mt-4 flex h-[52px] w-[52px] items-center justify-center self-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 xl:hidden"
        >
          <Feather className="h-6 w-6" />
        </button>
      </div>

      {/* Bottom: user widget */}
      <div className="flex items-center gap-3 rounded-full p-3 transition-colors hover:bg-accent">
        <UserButton
          appearance={{
            elements: {
              avatarBox: 'h-10 w-10',
            },
          }}
        />
      </div>
    </aside>
  );
}
