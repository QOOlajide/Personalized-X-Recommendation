# Best Practices — Frontend

<!-- Frontend tool usage and workflow guidelines -->

## Tech Stack

React, Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, Radix UI, Framer Motion, Zustand, Zod

---

## Next.js App Router

### Server vs Client Components
- **Default to Server Components** - Only use `'use client'` when you need interactivity, hooks, or browser APIs
- Keep client components **small and event-driven**
- Server Components: data fetching, backend resources, sensitive info, large dependencies
- Client Components: event listeners, useState/useEffect, browser APIs

### Route Handlers vs Server Actions
| Use Case | Recommendation |
|----------|----------------|
| Form submissions from your app | Server Actions |
| Database mutations from components | Server Actions |
| Public API for mobile apps | Route Handlers |
| Webhook endpoints | Route Handlers |
| Third-party integrations | Route Handlers |

### File Structure Convention
```
app/
├── page.tsx          # Unique UI for route
├── layout.tsx        # Shared UI for segment
├── loading.tsx       # Loading state
├── error.tsx         # Error boundary
├── not-found.tsx     # 404 page
└── route.ts          # API endpoint
```

### Data Fetching
- Fetch data in Server Components using async/await directly
- Use `revalidate` and `cache: 'force-cache'` intentionally
- For dashboards, opt into `no-store` only where needed
- Validate Server Action inputs with Zod, return typed payloads

### Best Practices
- Use private folders (`_folder`) for internal organization
- Use route groups (`(folder)`) for layout organization without URL changes
- Colocate components with routes when specific to that route

---

## Tailwind CSS

### Organization
- Use CSS variables for theme customization via `@theme` directive
- Convert HSL colors to OKLCH for better color manipulation
- Use the `cn()` utility (tailwind-merge) for class merging

### Tailwind v4 Theming
```css
@theme inline {
  --color-primary: oklch(0.7 0.15 250);
  --color-muted: oklch(0.5 0.05 250);
  --radius-lg: 0.75rem;
}
```

### Best Practices
- Use new `size-*` utility instead of `w-* h-*` where applicable
- Prefer `@import "tw-animate-css"` over `tailwindcss-animate`
- Use `data-slot` attributes for component styling hooks

---

## shadcn/ui

### Core Principles
- **Copy, don't import** - Components are local code, not a package
- **Radix first** - Behavior comes from Radix primitives
- **Tailwind for visuals** - No CSS-in-JS runtime
- **Opt-in complexity** - CVA variants and animations are optional

### Component Composition
```typescript
// Create semantic components, not just visual variants
import { Button } from '@/components/ui/button';

export function LoginButton({ isLoading, ...props }) {
  return (
    <Button disabled={isLoading} className="w-full" {...props}>
      {isLoading ? 'Signing in...' : 'Sign In'}
    </Button>
  );
}
```

### Best Practices
- Extend components rather than modifying core files
- Use compound components for complex UI patterns
- Import only what you need (tree-shaking)
- Always use Form components together (FormField, FormItem, FormLabel, etc.)

---

## Zustand (State Management)

### Store Structure
```typescript
interface StoreType {
  // State
  items: Item[];
  isLoading: boolean;
  
  // Actions (separate from state)
  actions: {
    addItem: (item: Item) => void;
    removeItem: (id: string) => void;
  };
}

export const useStore = create<StoreType>((set) => ({
  items: [],
  isLoading: false,
  actions: {
    addItem: (item) => set((state) => ({ items: [...state.items, item] })),
    removeItem: (id) => set((state) => ({ 
      items: state.items.filter(i => i.id !== id) 
    })),
  },
}));
```

### Best Practices
1. **Only export custom hooks** - Don't expose the raw store
2. **Use atomic, stable selectors** - Avoid object destructuring in selectors
3. **Separate actions from state** - Keep actions in a stable object
4. **Model actions as events** - Name them after what happened, not what to do
5. **Use multiple stores** - Split by domain, not by feature

### Selector Pattern
```typescript
// ❌ BAD: Creates new object every render
const { todos, isSubscribed } = useStore((state) => ({
  todos: state.todos,
  isSubscribed: state.isSubscribed,
}));

// ✅ GOOD: Atomic selectors
const todos = useStore((state) => state.todos);
const isSubscribed = useStore((state) => state.isSubscribed);
```

### Middleware
- Use `immer` for complex nested state updates
- Use `persist` for localStorage persistence
- Use `devtools` for Redux DevTools integration

---

## Zod (Validation)

### Schema Definition
```typescript
import { z } from 'zod';

export const UserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  age: z.number().min(18).optional(),
});

export type User = z.infer<typeof UserSchema>;
```

### Server Action Validation
```typescript
'use server';

import { UserSchema } from '@/lib/schemas';

export async function createUser(formData: FormData) {
  const result = UserSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  
  if (!result.success) {
    return { error: result.error.flatten() };
  }
  
  // Proceed with validated data
  return await db.users.create(result.data);
}
```

---

## Framer Motion

### Animation Best Practices
- Prefer CSS-only animations for simple effects
- Use Framer Motion for complex orchestration and gestures
- Focus on high-impact moments (page load, staggered reveals)

### Pattern
```typescript
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 }
};
```
