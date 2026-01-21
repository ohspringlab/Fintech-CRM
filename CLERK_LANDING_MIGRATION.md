# 🔄 Migrating Landing Page to Use Clerk

## Overview

This guide shows how to update your Landing page to use Clerk authentication instead of the legacy system.

---

## Current State

Your Landing page currently links to:
- `/register` - Legacy registration
- `/login` - Legacy login

---

## Option 1: Update Links to Clerk (Simple)

Find these links in `frontend/src/pages/Landing.tsx` and update them:

### Before:
```tsx
<Link to="/register">Get Started</Link>
<Link to="/login">Sign In</Link>
```

### After:
```tsx
<Link to="/clerk-signup">Get Started</Link>
<Link to="/clerk-signin">Sign In</Link>
```

---

## Option 2: Add Clerk Buttons (Recommended)

Use Clerk's built-in button components for a seamless experience:

### 1. Import Clerk components:
```tsx
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/clerk-react';
```

### 2. Update your header/navigation:
```tsx
<nav className="flex items-center gap-4">
  <SignedOut>
    <SignUpButton mode="modal">
      <button className="btn-primary">Get Started</button>
    </SignUpButton>
    <SignInButton mode="modal">
      <button className="btn-secondary">Sign In</button>
    </SignInButton>
  </SignedOut>
  
  <SignedIn>
    <Link to="/dashboard">Dashboard</Link>
    <UserButton afterSignOutUrl="/" />
  </SignedIn>
</nav>
```

---

## Option 3: Dual Authentication (Transition Period)

Keep both options available during migration:

```tsx
<div className="flex flex-col gap-4">
  {/* Clerk Authentication - Recommended */}
  <div>
    <h3>New User Experience (Recommended)</h3>
    <Link to="/clerk-signup" className="btn-primary">
      Sign Up with Clerk
    </Link>
    <Link to="/clerk-signin" className="btn-secondary">
      Sign In with Clerk
    </Link>
  </div>

  {/* Legacy Authentication */}
  <div>
    <h3>Existing Users</h3>
    <Link to="/register" className="btn-outline">
      Legacy Sign Up
    </Link>
    <Link to="/login" className="btn-outline">
      Legacy Sign In
    </Link>
  </div>
</div>
```

---

## Benefits of Clerk Buttons

1. **Modal Mode**: Sign in/up in a modal without leaving the page
2. **Redirect Mode**: Navigate to dedicated auth pages
3. **Automatic State Management**: Shows/hides based on auth status
4. **User Button**: Displays user avatar with dropdown menu

---

## Example: Complete Header Component

```tsx
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';

export function Header() {
  return (
    <header className="bg-navy-900 text-white">
      <div className="container mx-auto flex items-center justify-between py-4">
        <Link to="/" className="text-2xl font-bold">
          RPC Lending
        </Link>

        <nav className="flex items-center gap-6">
          <Link to="/loan-programs">Loan Programs</Link>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>

          <SignedOut>
            <SignInButton mode="modal">
              <button className="px-4 py-2 border border-gold-500 text-gold-500 rounded hover:bg-gold-500 hover:text-navy-900">
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="px-4 py-2 bg-gold-500 text-navy-900 rounded hover:bg-gold-600">
                Get Started
              </button>
            </SignUpButton>
          </SignedOut>

          <SignedIn>
            <Link to="/dashboard" className="px-4 py-2 text-gold-500 hover:text-gold-400">
              Dashboard
            </Link>
            <UserButton 
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-10 h-10"
                }
              }}
            />
          </SignedIn>
        </nav>
      </div>
    </header>
  );
}
```

---

## Testing Your Changes

1. **Signed Out State**: Visit `/` and verify sign-in/up buttons appear
2. **Sign Up Flow**: Click "Get Started" and create an account
3. **Signed In State**: Verify UserButton appears after sign in
4. **Dashboard Access**: Click dashboard link and verify access
5. **Sign Out**: Click UserButton and sign out

---

## Styling Clerk Components

Customize appearance to match your brand:

```tsx
<SignUpButton mode="modal">
  <button className="btn-primary">
    Get Started
  </button>
</SignUpButton>

{/* Or with custom appearance */}
<UserButton 
  appearance={{
    elements: {
      avatarBox: "w-10 h-10",
      userButtonPopoverCard: "bg-navy-900 text-white",
      userButtonPopoverActionButton: "text-gold-500 hover:text-gold-400"
    }
  }}
/>
```

---

## Migration Checklist

- [ ] Update Landing page links to Clerk routes
- [ ] Import Clerk components
- [ ] Add SignedIn/SignedOut logic
- [ ] Add UserButton for signed-in users
- [ ] Test sign-up flow
- [ ] Test sign-in flow
- [ ] Test sign-out flow
- [ ] Verify styling matches brand
- [ ] Update navigation in other shared components

---

## Need Help?

- Check `CLERK_COMPLETE_SETUP.md` for full setup guide
- Visit [Clerk React Components Docs](https://clerk.com/docs/components/overview)
- Test in development before deploying

---

**Pro Tip**: Start with Option 1 (simple link update) to get working quickly, then enhance with Clerk components (Option 2) for a better UX!
