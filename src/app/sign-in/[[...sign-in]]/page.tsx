'use client';

import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <SignIn
        path="/sign-in"
        routing="path"
        signUpUrl="/sign-up"
        appearance={{
          elements: {
            card: 'shadow-lg border border-border',
          },
          variables: {
            colorPrimary: 'hsl(var(--primary))',
          },
        }}
      />
    </div>
  );
}
