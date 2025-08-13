# GitHub OAuth Configuration Fix for Supabase

## Problem Summary

The GitHub OAuth login is failing with the error:

```
Error getting user profile from external provider
```

## Root Cause

The GitHub OAuth provider is **not configured in the Supabase project**. While the application code correctly handles OAuth and has proper GitHub API credentials, these credentials haven't been added to the Supabase project's authentication settings.

## Solution: Configure GitHub OAuth in Supabase Dashboard

### Step 1: Access Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/jaklhhckzosiodpsicrd
2. Navigate to **Authentication** → **Providers**
3. Find the **GitHub** provider in the list

### Step 2: Enable GitHub Provider

1. Click on **GitHub** to expand the configuration
2. Toggle **Enable GitHub** to ON
3. Add the following credentials:
   - **Client ID**: Check your GitHub OAuth App settings
   - **Client Secret**: Check your GitHub OAuth App settings

### Step 3: Configure GitHub OAuth App (if not already done)

1. Go to GitHub Settings: https://github.com/settings/developers
2. Click on **OAuth Apps** → **New OAuth App** (or edit existing)
3. Configure with these settings:
   - **Application name**: Context AI Note-Taking
   - **Homepage URL**: http://localhost:3000 (for development)
   - **Authorization callback URL**:
     ```
     https://jaklhhckzosiodpsicrd.supabase.co/auth/v1/callback
     ```
4. Save and copy the **Client ID** and **Client Secret**

### Step 4: Update Supabase with GitHub Credentials

Back in Supabase Dashboard:

1. Paste the **Client ID** from GitHub
2. Paste the **Client Secret** from GitHub
3. (Optional) Configure additional scopes if needed:
   - Default scopes should include: `user:email read:user`
4. Click **Save**

### Step 5: Test the Configuration

1. Clear your browser cookies for localhost:3000
2. Go to http://localhost:3000/auth/sign-in
3. Click "Sign in with GitHub"
4. You should be redirected to GitHub for authorization
5. After authorizing, you should be redirected back to the dashboard

## Alternative: Configure via Supabase Management API

If you have a Supabase access token, you can configure it programmatically:

```bash
# Get your access token from https://supabase.com/dashboard/account/tokens
export SUPABASE_ACCESS_TOKEN="your-access-token"
export PROJECT_REF="jaklhhckzosiodpsicrd"
export GITHUB_CLIENT_ID="your-github-client-id"
export GITHUB_CLIENT_SECRET="your-github-client-secret"

# Configure GitHub auth provider
curl -X PATCH "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "external_github_enabled": true,
    "external_github_client_id": "'$GITHUB_CLIENT_ID'",
    "external_github_secret": "'$GITHUB_CLIENT_SECRET'"
  }'
```

## Verification Checklist

- [ ] GitHub OAuth App has correct callback URL
- [ ] GitHub OAuth App is not in "Suspended" state
- [ ] Supabase project has GitHub provider enabled
- [ ] Client ID matches between GitHub and Supabase
- [ ] Client Secret is correctly copied (no extra spaces)
- [ ] Callback URL uses the Supabase project's URL

## Common Issues and Solutions

### Issue 1: Still getting "Error getting user profile"

- **Cause**: GitHub account has private email
- **Solution**:
  1. Go to GitHub Settings → Emails
  2. Uncheck "Keep my email addresses private"
  3. OR add a public email address to your GitHub profile

### Issue 2: Redirect URI mismatch

- **Cause**: Callback URL doesn't match exactly
- **Solution**: Ensure the callback URL in GitHub OAuth App is exactly:
  ```
  https://jaklhhckzosiodpsicrd.supabase.co/auth/v1/callback
  ```

### Issue 3: Invalid client credentials

- **Cause**: Wrong Client ID or Secret
- **Solution**: Regenerate the Client Secret in GitHub and update in Supabase

## Code Implementation Status

✅ **The application code is already correctly implemented:**

- OAuth scopes are properly configured (`user:email read:user`)
- Error handling with user-friendly messages
- GitHub privacy issue detection
- Proper OAuth flow with state management
- Comprehensive logging for debugging

The only missing piece is the Supabase project configuration.

## After Configuration

Once the GitHub provider is configured in Supabase:

1. Users with public emails will be able to sign in immediately
2. Users with private emails will see helpful error messages
3. The OAuth flow will complete successfully
4. User profiles will be created automatically via the database triggers

## Support

If issues persist after configuration:

1. Check Supabase logs: Dashboard → Logs → Auth
2. Verify GitHub OAuth App status
3. Test with a different GitHub account
4. Try Google OAuth as an alternative
