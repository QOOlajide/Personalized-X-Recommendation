# Best Practices — Backend & Infrastructure

<!-- Backend tool usage and workflow guidelines -->

## Tech Stack

TypeScript (Next.js API routes / Server Actions), Python + FastAPI, PostgreSQL, Redis, Vercel

---

## TypeScript Backend (Next.js API Routes)

### Route Handler Pattern
```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const users = await db.users.findMany();
  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  // Validate with Zod before processing
  const user = await db.users.create(body);
  return NextResponse.json(user, { status: 201 });
}
```

### Authentication Wrapper Pattern
```typescript
// lib/api/with-auth.ts
export function withAuth(handler: AuthenticatedHandler) {
  return async (request: NextRequest, context: Context) => {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return handler(request, { ...context, user: session.user });
  };
}
```

---

## FastAPI (Python Backend)

### Async/Sync Rules (Critical!)
```python
# ❌ NEVER: Blocking operation in async route
@router.get("/bad")
async def bad_endpoint():
    time.sleep(10)  # Blocks entire event loop!
    return {"status": "done"}

# ✅ GOOD: Use regular def for blocking operations
@router.get("/good")
def good_endpoint():
    time.sleep(10)  # Runs in threadpool
    return {"status": "done"}

# ✅ BEST: Use async-friendly libraries
@router.get("/best")
async def best_endpoint():
    await asyncio.sleep(10)  # Non-blocking
    return {"status": "done"}
```

### Dependency Injection
```python
# Use dependencies for database connections
def get_db(pool: AsyncConnectionPool = Depends(get_pool)) -> Database:
    return Database(pool)

@app.get("/items")
async def get_items(db: Database = Depends(get_db)):
    return await db.get_items()
```

### Best Practices
- Use Pydantic for all validation - never validate manually
- Use `BaseSettings` for environment variable management
- Don't expose Swagger/ReDoc in production
- Use lifespan events for resource management (connection pools)
- Use structured logging (not print statements)
- Deploy with Uvicorn + Gunicorn + uvloop for production

---

## PostgreSQL

### Connection Management
- Use connection pooling (Vercel Postgres SDK handles this)
- Never create new connections per request
- Use `@vercel/postgres` SDK for serverless optimization

### Best Practices
- Design proper schema with foreign keys and indexes
- Use transactions for multi-step operations
- Implement proper migrations strategy

---

## Redis (Vercel KV)

### Use Cases
- **Caching**: Frequently accessed data, API responses
- **Session Management**: User sessions across serverless functions
- **Rate Limiting**: Track and limit user requests
- **Feature Flags**: Quick toggles without redeployment

### Best Practices
- Use for ephemeral data that can be regenerated
- Leverage Edge Runtime for minimal latency
- Set appropriate TTLs for cached data

---

## Vercel Deployment

### Environment Variables
- Use Vercel dashboard for production secrets
- Pull env vars locally with `vercel env pull`
- Never commit `.env` files

### Performance
- Use ISR (Incremental Static Regeneration) where appropriate
- Leverage Edge Runtime for global low-latency
- Use Vercel Analytics to monitor Core Web Vitals

### Best Practices
- Preview deployments for every PR
- Use `vercel.json` for redirects and headers
- Implement proper caching headers

---

## Git Workflow

### Commit Convention
```
feat: add user authentication
fix: resolve login redirect issue
docs: update API documentation
refactor: simplify database queries
test: add unit tests for auth service
```

### Branch Strategy
- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - New features
- `fix/*` - Bug fixes

---

## Code Review Process

### Checklist
- [ ] Code follows established patterns
- [ ] TypeScript types are properly defined
- [ ] Error handling is implemented
- [ ] Loading states are handled
- [ ] Accessibility requirements met
- [ ] No console.logs in production code
- [ ] Tests added/updated if needed

---

## Debugging Approach

1. **Reproduce** - Confirm the issue exists
2. **Isolate** - Find the smallest reproduction
3. **Investigate** - Check logs, network, state
4. **Fix** - Apply minimal change
5. **Verify** - Confirm fix doesn't break other things
6. **Document** - Note the root cause if significant
