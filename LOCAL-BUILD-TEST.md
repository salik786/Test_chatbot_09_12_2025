# How to Test Build Locally BEFORE Deploying

This guide shows you how to catch all TypeScript and build errors **BEFORE** pushing to Vercel.

## ⚠️ ALWAYS Run These Commands Before Deploying

### 1. Install Dependencies (if not already installed)
```bash
npm install
```

### 2. Type Check Only (Fast - Recommended First)
```bash
npx tsc --noEmit
```

**What this does:**
- Checks ALL TypeScript errors
- Does NOT create build files
- Fast - completes in ~10 seconds
- **Run this FIRST** before building

**Expected Output:**
```
# If successful - NO OUTPUT (silent success)

# If errors found - shows all TypeScript errors with line numbers
```

### 3. Full Production Build (Slower but Complete)
```bash
npm run build
```

**What this does:**
- Type checks TypeScript
- Compiles all code
- Optimizes for production
- Creates `.next` folder
- Takes ~30-60 seconds

**Expected Output:**
```
✓ Compiled successfully
   Linting and checking validity of types ...
✓ Linting and checking validity of types
   Creating an optimized production build ...
✓ Created an optimized production build
```

### 4. Test the Production Build Locally
```bash
npm start
```

Then visit: http://localhost:3000

**Test:**
- Login works
- Chat works
- Admin panel works
- Public chat links work

## 🚨 If You Get Errors

### Common TypeScript Errors & Fixes

#### Error: "Property 'X' does not exist on type 'never'"
**Cause:** Supabase type inference failure

**Fix:** Add type assertion
```typescript
// Before (WRONG)
const { data: profile } = await supabase
  .from('profiles')
  .select('is_admin')
  .single();

// After (CORRECT)
const { data: profile } = await supabase
  .from('profiles')
  .select('is_admin')
  .single() as { data: { is_admin: boolean } | null };
```

#### Error: "Spread types may only be created from object types"
**Cause:** TypeScript can't infer object type

**Fix:** Add explicit type annotation
```typescript
// Before (WRONG)
return profiles.map(p => ({ ...p, extra: [] }));

// After (CORRECT)
return profiles.map((p: Profile) => ({ ...p, extra: [] }));
```

#### Error: "Type 'null' is not assignable to type 'string'"
**Cause:** Field is nullable in database

**Fix:** Add null check
```typescript
// Before (WRONG)
if (msg.user_id) {
  doSomething(msg.user_id);
}

// After (CORRECT)
const userId = msg.user_id;
if (userId) {
  doSomething(userId);
}
```

## 📝 Quick Reference Commands

```bash
# Type check only (fast)
npx tsc --noEmit

# Full build test
npm run build

# Run production build locally
npm start

# Development mode
npm run dev
```

## 🔍 Detailed Error Checking Process

### Step 1: Clean Build
```bash
# Remove old build files
rm -rf .next

# Clean install dependencies
rm -rf node_modules
npm install
```

### Step 2: Type Check
```bash
npx tsc --noEmit 2>&1 | tee typescript-errors.log
```

This creates a `typescript-errors.log` file with all errors.

### Step 3: Fix All Errors
Work through each error in the log file:
1. Open the file mentioned in error
2. Go to the line number
3. Apply appropriate fix (see examples above)
4. Re-run type check
5. Repeat until no errors

### Step 4: Build
```bash
npm run build
```

### Step 5: Test Locally
```bash
npm start
# Visit http://localhost:3000
```

## 🎯 Automated Pre-Deployment Script

Create a file: `check-before-deploy.sh`

```bash
#!/bin/bash

echo "🔍 Step 1: Type Checking..."
npx tsc --noEmit
if [ $? -ne 0 ]; then
  echo "❌ TypeScript errors found! Fix them before deploying."
  exit 1
fi

echo "✅ Type check passed!"
echo ""
echo "🏗️  Step 2: Building..."
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Build failed! Fix errors before deploying."
  exit 1
fi

echo "✅ Build successful!"
echo ""
echo "✅ All checks passed! Safe to deploy."
```

Make it executable:
```bash
chmod +x check-before-deploy.sh
```

Run before deploying:
```bash
./check-before-deploy.sh
```

## 📦 Add to package.json

Add this to your `package.json` scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "validate": "npm run typecheck && npm run build"
  }
}
```

Then run:
```bash
npm run validate
```

This runs both type check AND build.

## 🔄 Recommended Workflow

**Before Every Deploy:**

1. ✅ Make your code changes
2. ✅ Save all files
3. ✅ Run: `npm run typecheck`
4. ✅ Fix any errors
5. ✅ Run: `npm run build`
6. ✅ Fix any errors
7. ✅ Test locally: `npm start`
8. ✅ Commit and push
9. ✅ Deploy to Vercel

## 🐛 Why Am I Getting These Errors?

### Root Cause
Supabase's TypeScript SDK has issues with:
- Single column selects (`.select('is_admin')`)
- Nullable fields (`user_id: string | null`)
- Filter operations (`.not()`, `.is()`)

### Solution
Always add explicit type assertions for Supabase queries that:
1. Select single columns
2. Use `.single()`
3. Work with nullable fields

## 📊 Compare Local vs Vercel Build

| Check | Local | Vercel |
|-------|-------|--------|
| Type checking | `npx tsc --noEmit` | Automatic |
| Build | `npm run build` | Automatic |
| Node version | Your version | 18.x+ |
| Env vars | `.env.local` | Dashboard |
| Cache | `.next` folder | Edge cache |

**Important:** Vercel uses same build command as local!
- If `npm run build` fails locally, it WILL fail on Vercel
- If `npx tsc --noEmit` shows errors, build WILL fail

## ✅ Final Checklist

Before deploying to Vercel:

- [ ] Run `npx tsc --noEmit` - No errors
- [ ] Run `npm run build` - Successful
- [ ] Run `npm start` - Test locally
- [ ] Test login, chat, admin features
- [ ] All environment variables set in Vercel
- [ ] Database migrations run
- [ ] Commit and push to Git
- [ ] Deploy to Vercel

## 🎓 Pro Tips

1. **Run type check after every change**: `npx tsc --noEmit`
2. **Use VS Code**: Shows TypeScript errors in real-time
3. **Enable strict mode**: Already enabled in `tsconfig.json`
4. **Check before commits**: Run validation script
5. **Keep dependencies updated**: `npm update`

## 🆘 Still Getting Errors?

If you follow this guide and still get errors on Vercel:

1. Check Node version matches (18.x+)
2. Verify all env vars are set in Vercel
3. Check build logs for different error message
4. Ensure all dependencies in `package.json`
5. Try `npm ci` instead of `npm install`

---

**Remember:** If it builds locally, it WILL build on Vercel!

Always test locally first using `npm run build`.
