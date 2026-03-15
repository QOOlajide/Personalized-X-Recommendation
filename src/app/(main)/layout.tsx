import { LeftSidebar } from '../../components/LeftSidebar';
import { RightSidebar } from '../../components/RightSidebar';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-screen max-w-[1280px]">
      {/* Left sidebar — icons only on lg, full on xl */}
      <div className="hidden md:flex w-[68px] shrink-0 xl:w-[275px]">
        <LeftSidebar />
      </div>

      {/* Center column — the timeline / main content */}
      <main className="min-h-screen flex-1 border-x border-border max-w-[600px]">
        {children}
      </main>

      {/* Right sidebar — hidden below lg */}
      <div className="hidden lg:block w-[350px] shrink-0">
        <RightSidebar />
      </div>
    </div>
  );
}
