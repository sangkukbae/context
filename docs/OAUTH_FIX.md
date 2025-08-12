# OAuth Authentication Fix

This document outlines the fixes implemented to resolve the "Database error saving new user" issue with Google OAuth login in Supabase.

## Problem Summary

The error occurred at: `/?error=server_error&error_code=unexpected_failure&error_description=Database+error+saving+new+user`

**Root Causes:**
1. Missing proper OAuth callback handler using `exchangeCodeForSession`
2. Missing database triggers for user profile creation
3. Incomplete RLS policies for new user insertion
4. Client-side callback page instead of server-side route

## Fixes Implemented

### 1. Created Proper OAuth Callback Route
**File:** `/app/auth/callback/route.ts`

- Replaced client-side callback page with server-side route handler
- Implements `exchangeCodeForSession` to properly exchange OAuth code for session
- Handles errors gracefully with proper redirect URLs
- Supports state parameter for custom redirect URLs

### 2. Database Migration for User Profile Creation
**File:** `/database/migrations/002_auth_triggers.sql`

**Key Components:**
- `handle_new_user()` function triggered when new users sign up
- Trigger on `auth.users` table for automatic profile creation
- Updated RLS policies allowing users to create their own profiles
- `sync_user_profile()` helper function for profile updates

**Trigger Logic:**
```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 3. Updated OAuth Client Configuration
**File:** `/lib/auth/client.ts`

- Fixed OAuth redirect URL to use proper callback route
- Added state parameter support for preserving final redirect destination
- Improved error handling with proper error propagation

### 4. Migration Scripts
**Files:**
- `/scripts/run-migration.js` - Simple Node.js script using pg client
- `/scripts/apply-auth-migration.ts` - TypeScript version using Supabase client

## Testing the Fix

### 1. Apply the Database Migration
```bash
# Using Node.js script (requires pg package)
npm install pg
node scripts/run-migration.js

# Or using TypeScript version (if tsx is available)
npx tsx scripts/apply-auth-migration.ts
```

### 2. Verify Supabase Configuration

Ensure these environment variables are set:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### 3. Configure OAuth Callback URL in Supabase

In your Supabase dashboard:
1. Go to Authentication → URL Configuration
2. Add to **Redirect URLs**:
   - `http://localhost:3000/auth/callback` (development)
   - `https://yourdomain.com/auth/callback` (production)

### 4. Test the OAuth Flow

1. Start the development server: `pnpm dev`
2. Navigate to `/auth/sign-in`
3. Click "Continue with Google"
4. Complete Google OAuth
5. Verify redirect to `/dashboard` without errors

## What the Fix Does

### OAuth Flow (Before Fix)
1. User clicks "Continue with Google"
2. Redirects to Google OAuth
3. Google redirects to `/auth/callback` (client-side page)
4. Client tries to get session but code exchange fails
5. **Error**: Database error saving new user

### OAuth Flow (After Fix)
1. User clicks "Continue with Google"
2. Redirects to Google OAuth
3. Google redirects to `/auth/callback` (server-side route)
4. Server exchanges OAuth code for session using `exchangeCodeForSession`
5. Supabase creates user in `auth.users` table
6. Database trigger automatically creates profile in `public.users` table
7. User is redirected to dashboard with active session

## Error Monitoring

The fix includes comprehensive error handling:

### Client-Side Errors
- OAuth provider errors
- Network failures
- Invalid state parameters

### Server-Side Errors
- Code exchange failures
- Database connection issues
- Missing environment variables

### Database Errors
- Profile creation failures
- RLS policy violations
- Trigger execution errors

## Rollback Instructions

If you need to rollback the changes:

```sql
-- Remove the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Remove the function
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.sync_user_profile(UUID);

-- Remove the RLS policies
DROP POLICY IF EXISTS users_can_create_own_profile ON users;
DROP POLICY IF EXISTS users_can_view_own_profile ON users;
DROP POLICY IF EXISTS users_can_update_own_profile ON users;
```

## Next Steps

1. **Test thoroughly** with different OAuth providers (Google, GitHub)
2. **Monitor errors** in production using Sentry or similar tools
3. **Verify user profiles** are created correctly in the database
4. **Check email verification** flows work as expected
5. **Test edge cases** like network failures and browser back/forward navigation

## Additional Security Considerations

- The `handle_new_user()` function runs with `SECURITY DEFINER` to ensure proper permissions
- RLS policies prevent users from accessing other users' data
- OAuth state parameter prevents CSRF attacks
- Proper error messages avoid information leakage

This fix should resolve the "Database error saving new user" issue and provide a robust OAuth authentication flow.