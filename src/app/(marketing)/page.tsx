import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Navbar } from './_components/Navbar';
import { Hero } from './_components/Hero';
import { Features } from './_components/Features';
import { HowItWorks } from './_components/HowItWorks';
import { Audience } from './_components/Audience';
import { OpenSource } from './_components/OpenSource';
import { FinalCta } from './_components/FinalCta';

const GITHUB_URL =
  'https://github.com/QOOlajide/Personalized-X-Recommendation';

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect('/feed');

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <Hero githubUrl={GITHUB_URL} />
      <Features />
      <HowItWorks />
      <Audience />
      <OpenSource githubUrl={GITHUB_URL} />
      <FinalCta githubUrl={GITHUB_URL} />
    </div>
  );
}
