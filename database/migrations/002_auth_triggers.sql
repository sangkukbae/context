-- Context AI Note-Taking Application
-- Auth Triggers Migration - Handle new user profile creation
-- This migration adds Supabase auth integration triggers

-- ============================================================================
-- SUPABASE AUTH INTEGRATION
-- ============================================================================

-- Function to handle new user registration
-- This function is triggered when a new user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a new user record into our users table
  INSERT INTO public.users (
    id,
    email,
    name,
    avatar,
    email_verified,
    created_at,
    updated_at,
    preferences
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN NEW.email_confirmed_at ELSE NULL END,
    NEW.created_at,
    NEW.updated_at,
    '{
        "theme": "system",
        "autoSave": true,
        "notifications": true,
        "clusterSuggestions": true
    }'::jsonb
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table to call handle_new_user function
-- This trigger fires after a new user is inserted into auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- UPDATE RLS POLICIES FOR NEW USER CREATION
-- ============================================================================

-- Allow users to insert their own profile during registration
-- This policy enables the handle_new_user trigger to work properly
CREATE POLICY users_can_create_own_profile ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow users to view their own profile
CREATE POLICY users_can_view_own_profile ON users
  FOR SELECT USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY users_can_update_own_profile ON users
  FOR UPDATE USING (auth.uid() = id);

-- ============================================================================
-- HELPER FUNCTION FOR PROFILE SYNC
-- ============================================================================

-- Function to sync user profile from auth.users to public.users
-- This can be called to update user metadata after OAuth sign-in
CREATE OR REPLACE FUNCTION public.sync_user_profile(user_id UUID)
RETURNS void AS $$
DECLARE
  auth_user RECORD;
BEGIN
  -- Get the auth user data
  SELECT * FROM auth.users WHERE id = user_id INTO auth_user;
  
  IF auth_user IS NULL THEN
    RAISE EXCEPTION 'User not found in auth.users: %', user_id;
  END IF;
  
  -- Update or insert user profile
  INSERT INTO public.users (
    id,
    email,
    name,
    avatar,
    email_verified,
    updated_at
  )
  VALUES (
    auth_user.id,
    auth_user.email,
    COALESCE(auth_user.raw_user_meta_data->>'full_name', auth_user.raw_user_meta_data->>'name', auth_user.email),
    auth_user.raw_user_meta_data->>'avatar_url',
    auth_user.email_confirmed_at,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, users.name),
    avatar = COALESCE(EXCLUDED.avatar, users.avatar),
    email_verified = EXCLUDED.email_verified,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant necessary permissions for the trigger function
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated;
GRANT ALL ON public.users TO postgres;
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;
GRANT EXECUTE ON FUNCTION public.sync_user_profile(UUID) TO authenticated, postgres;

-- Migration complete
SELECT 'Auth triggers migration completed successfully' AS status;