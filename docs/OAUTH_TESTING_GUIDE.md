# Google OAuth Testing Guide

This guide walks through testing the Google OAuth fix to ensure the "Database error saving new user" issue is resolved.

## Prerequisites

1. **Environment Variables Setup**
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   DATABASE_URL=your_database_connection_string
   
   # Google OAuth
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   
   # NextAuth (for compatibility)
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_nextauth_secret
   ```

2. **Google OAuth Configuration**
   In [Google Cloud Console](https://console.cloud.google.com):
   - Add redirect URI: `http://localhost:3000/auth/callback`
   - Add redirect URI: `https://yourdomain.com/auth/callback` (production)

3. **Supabase OAuth Configuration**
   In Supabase Dashboard → Authentication → URL Configuration:
   - Site URL: `http://localhost:3000` (development) / `https://yourdomain.com` (production)
   - Redirect URLs:
     - `http://localhost:3000/auth/callback`
     - `https://yourdomain.com/auth/callback`

## Step 1: Apply Database Migration

Choose one of these methods:

### Option A: Using the TypeScript Migration Script
```bash
# Install pg dependency (if not already installed)
npm install pg

# Run the migration
pnpm run db:migrate:auth
```

### Option B: Manual SQL Execution
1. Go to Supabase SQL Editor: https://app.supabase.com/project/[your-project]/sql
2. Copy and paste the content from `/database/migrations/002_auth_triggers.sql`
3. Execute the SQL

### Option C: Using Node.js Script
```bash
# Install pg dependency
npm install pg

# Run the simple Node.js script
node scripts/run-migration.js
```

## Step 2: Verify Database Setup

Check that the migration was successful:

```sql
-- Check if the function exists
SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user'
);

-- Check if the trigger exists
SELECT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'on_auth_user_created'
);

-- Check RLS policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename = 'users';
```

## Step 3: Test OAuth Flow

### Test Case 1: New User Registration
1. Clear browser cache and cookies for your domain
2. Start development server: `pnpm dev`
3. Navigate to `http://localhost:3000/auth/sign-in`
4. Click "Continue with Google"
5. Complete Google OAuth flow with a **new** Google account
6. **Expected Result**: 
   - Redirected to `/dashboard` 
   - No error messages
   - User profile created in database

### Test Case 2: Existing User Login
1. Use the same Google account from Test Case 1
2. Navigate to `http://localhost:3000/auth/sign-in`
3. Click "Continue with Google"
4. **Expected Result**: 
   - Redirected to `/dashboard`
   - User profile updated with latest info

### Test Case 3: Error Handling
1. Temporarily disable your internet connection
2. Try Google OAuth
3. **Expected Result**: 
   - Proper error message displayed
   - No redirect to error URL with database error

## Step 4: Verify Database Records

After successful OAuth, check the database:

```sql
-- Check that user record was created
SELECT id, email, name, avatar, email_verified, created_at 
FROM users 
WHERE email = 'your-test-email@gmail.com';

-- Check auth.users record
SELECT id, email, email_confirmed_at, raw_user_meta_data 
FROM auth.users 
WHERE email = 'your-test-email@gmail.com';
```

## Step 5: Test Edge Cases

### Redirect URL Preservation
1. Try accessing a protected route: `http://localhost:3000/dashboard`
2. Get redirected to sign-in
3. Complete OAuth
4. **Expected Result**: Redirected back to `/dashboard` after auth

### Multiple Providers (if configured)
1. Test GitHub OAuth if configured
2. **Expected Result**: Same smooth flow as Google

### Session Persistence
1. Complete OAuth login
2. Close browser
3. Reopen and navigate to app
4. **Expected Result**: Still logged in (session persisted)

## Common Issues and Solutions

### Issue: "Database error saving new user"
**Symptoms**: URL shows `/?error=server_error&error_code=unexpected_failure&error_description=Database+error+saving+new+user`

**Solutions**:
1. Verify migration was applied successfully
2. Check database permissions for the service role
3. Ensure RLS policies allow user creation
4. Check Supabase logs for specific error details

### Issue: "Invalid redirect URL"
**Symptoms**: Google OAuth returns an error about redirect URL

**Solutions**:
1. Verify Google Cloud Console has correct redirect URLs
2. Ensure Supabase Dashboard has correct redirect URLs  
3. Check that URLs exactly match (including http/https)

### Issue: Migration fails
**Symptoms**: Migration script reports errors

**Solutions**:
1. Check DATABASE_URL is correct
2. Ensure service role key has proper permissions
3. Run SQL manually in Supabase SQL Editor
4. Check if auth.users table is accessible

### Issue: User profile not created
**Symptoms**: OAuth succeeds but no profile in `users` table

**Solutions**:
1. Check if trigger is properly installed
2. Verify trigger function exists and has correct permissions
3. Check Supabase logs for trigger execution errors
4. Manually run `SELECT public.sync_user_profile('[user-id]')` 

## Debug OAuth Flow

Enable debug logging in the callback route by adding:

```typescript
// In app/auth/callback/route.ts
console.log('OAuth callback params:', {
  code: !!code,
  error,
  errorDescription,
  searchParams: Object.fromEntries(requestUrl.searchParams)
})
```

## Production Deployment Notes

1. **Update redirect URLs** for your production domain
2. **Set proper environment variables** in your hosting provider
3. **Test OAuth flow** in production environment
4. **Monitor error rates** using Sentry or similar
5. **Check database performance** after migration

## Success Criteria

✅ New users can sign in with Google without errors  
✅ User profiles are automatically created in the database  
✅ Existing users can sign in and profiles are updated  
✅ Redirect URLs work properly after authentication  
✅ Error handling provides clear feedback  
✅ Session persistence works correctly  
✅ Database triggers execute without errors  

If all criteria pass, the OAuth fix is working correctly!