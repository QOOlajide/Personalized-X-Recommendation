import { Hero } from './_components/Hero';
import { Features } from './_components/Features';
import { HowItWorks } from './_components/HowItWorks';
import { Audience } from './_components/Audience';
import { OpenSource } from './_components/OpenSource';
import { FinalCta } from './_components/FinalCta';

const GITHUB_URL =
  'https://github.com/QOOlajide/Personalized-X-Recommendation';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Hero githubUrl={GITHUB_URL} />
      <Features />
      <HowItWorks />
      <Audience />
      <OpenSource githubUrl={GITHUB_URL} />
      <FinalCta githubUrl={GITHUB_URL} />
    </div>
  );
}
