# GitHub OAuth Authentication Fix

This document explains the fix for the GitHub OAuth login error: "Error getting user profile from external provider"

## Root Cause

The error occurs when Supabase attempts to retrieve user profile information from GitHub after successful OAuth authentication. This typically happens due to:

1. **Insufficient OAuth Scopes**: GitHub requires specific scopes to access user profile and email data
2. **Private Email Settings**: GitHub users can set their email addresses to private, preventing profile access
3. **Missing Error Handling**: Users weren't informed about what went wrong or how to fix it

## Implemented Solutions

### 1. Enhanced OAuth Scopes

**File: `/lib/auth/client.ts`**

Updated the GitHub OAuth configuration to request proper scopes:

```typescript
// GitHub requires specific scopes to access user profile and email
// user:email scope is needed for private email addresses
// read:user scope is needed for full profile access
oauthOptions.queryParams = {
  scope: 'user:email read:user',
}
```

**Required GitHub OAuth Scopes:**

- `user:email` - Access to user email addresses (required for private emails)
- `read:user` - Access to user profile information

### 2. Comprehensive Error Handling

**Files: `/app/auth/sign-in/page.tsx`, `/app/auth/sign-up/page.tsx`**

Added OAuth error parameter handling to capture and display errors from the callback:

```typescript
const oauthError = searchParams.get('error')
const oauthErrorDescription = searchParams.get('error_description')
```

### 3. User-Friendly Error Messages

**File: `/lib/auth/oauth-utils.ts`**

Created centralized error handling with specific messages for GitHub privacy issues:

```typescript
export function getOAuthErrorInfo(error: string, description?: string): OAuthErrorInfo {
  if (error === 'server_error' && description?.includes('Error getting user profile')) {
    return {
      userMessage:
        'Unable to access your GitHub profile. This might be because your email is set to private in GitHub.',
      isGitHubPrivacyIssue: true,
    }
  }
  // ... other error cases
}
```

### 4. Enhanced Callback Logging

**File: `/app/auth/callback/route.ts`**

Added comprehensive logging for debugging OAuth issues:

```typescript
logOAuthEvent('callback_received', {
  hasCode: !!code,
  error,
  errorDescription,
  errorCode,
  url: requestUrl.toString(),
})
```

### 5. User Guidance

Added actionable troubleshooting steps for GitHub users:

```typescript
export const GITHUB_TROUBLESHOOTING_STEPS = [
  'Go to GitHub Settings → Emails',
  'Uncheck "Keep my email addresses private"',
  'Ensure you have at least one verified email address',
  'Or try signing in with Google instead',
] as const
```

## GitHub Account Configuration

For users experiencing GitHub OAuth issues, they need to:

1. **Go to GitHub Settings**
   - Navigate to https://github.com/settings/emails

2. **Make Email Public**
   - Uncheck "Keep my email addresses private"
   - Ensure at least one verified email is available

3. **Alternative Solution**
   - Use Google OAuth instead, which doesn't have the same privacy restrictions

## Technical Details

### OAuth Flow

1. **Client initiates OAuth** → GitHub with proper scopes
2. **GitHub redirects to callback** → With code or error
3. **Callback exchanges code** → For session with Supabase
4. **Supabase fetches profile** → From GitHub API (this is where it was failing)
5. **Session created** → User authenticated

### Scopes Required

- **Without proper scopes**: GitHub API returns limited profile data
- **With `user:email` scope**: Access to all email addresses (including private)
- **With `read:user` scope**: Full profile information access

### Error States Handled

- `server_error` - GitHub API errors (profile access issues)
- `access_denied` - User denied permission
- `exchange_failed` - Code exchange failures
- `no_session` - Session creation failures
- `unexpected_error` - Catch-all for other issues

## Monitoring & Debugging

The enhanced logging provides insight into:

- OAuth attempt initiation
- Scope configuration
- Callback parameters received
- Code exchange results
- Session creation success/failure
- User profile data access

All events are logged with timestamps and relevant context for debugging production issues.

## Testing

To test the fix:

1. **Test with private GitHub email**:
   - Set GitHub email to private
   - Attempt OAuth login
   - Should see user-friendly error with troubleshooting steps

2. **Test with public GitHub email**:
   - Set GitHub email to public
   - Attempt OAuth login
   - Should complete successfully

3. **Test error display**:
   - Verify error messages appear on sign-in page
   - Verify error parameters are cleared from URL after display
   - Verify troubleshooting steps are shown for GitHub privacy issues

## Future Improvements

Consider implementing:

1. **Automatic scope detection**: Detect missing scopes and request them
2. **Progressive profile completion**: Allow sign-in with minimal profile data
3. **Alternative profile sources**: Fallback to username if email unavailable
4. **GitHub App integration**: Use GitHub Apps for more reliable profile access
