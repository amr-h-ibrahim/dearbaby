-- =============================================================================
-- BACKEND FIXES FOR BABY INVITE FEATURE
-- Run these SQL statements in your Supabase SQL Editor
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. FIX: Update create_baby_invite RPC to ensure it returns the invite data
-- -----------------------------------------------------------------------------
-- This RPC creates the invite record. Make sure it returns the invite_id
-- so the frontend can pass it to the email function.

CREATE OR REPLACE FUNCTION dearbaby.create_baby_invite(
  p_baby_id UUID,
  p_invited_email TEXT,
  p_role TEXT DEFAULT 'editor'
)
RETURNS TABLE (
  invite_id UUID,
  baby_id UUID,
  invited_email TEXT,
  role TEXT,
  status TEXT,
  invite_token TEXT,
  created_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = dearbaby, public
LANGUAGE plpgsql
AS $$
DECLARE
  v_inviter_id UUID;
  v_invite_token TEXT;
  v_invite_id UUID;
BEGIN
  -- Get the current user's ID
  v_inviter_id := auth.uid();

  -- Check if user has permission to invite (must be owner or editor)
  IF NOT EXISTS (
    SELECT 1 FROM dearbaby.parent_baby
    WHERE user_id = v_inviter_id
    AND baby_id = p_baby_id
    AND role IN ('owner', 'editor')
  ) THEN
    RAISE EXCEPTION 'You do not have permission to invite users to this baby';
  END IF;

  -- Check if invited email is already a member
  IF EXISTS (
    SELECT 1 FROM dearbaby.parent_baby pb
    JOIN auth.users u ON pb.user_id = u.id
    WHERE pb.baby_id = p_baby_id
    AND u.email = p_invited_email
  ) THEN
    RAISE EXCEPTION 'This email is already a member of this baby';
  END IF;

  -- Check if there's already a pending invite for this email
  IF EXISTS (
    SELECT 1 FROM dearbaby.baby_invites
    WHERE baby_id = p_baby_id
    AND invited_email = p_invited_email
    AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'There is already a pending invite for this email';
  END IF;

  -- Generate a secure random token
  v_invite_token := encode(gen_random_bytes(32), 'base64');

  -- Insert the invite record
  INSERT INTO dearbaby.baby_invites (
    baby_id,
    invited_by,
    invited_email,
    role,
    status,
    invite_token,
    invite_email_sent,
    created_at
  ) VALUES (
    p_baby_id,
    v_inviter_id,
    p_invited_email,
    p_role,
    'pending',
    v_invite_token,
    FALSE,  -- Will be updated by Edge Function
    NOW()
  ) RETURNING id INTO v_invite_id;

  -- Return the created invite
  RETURN QUERY
  SELECT
    bi.id as invite_id,
    bi.baby_id,
    bi.invited_email,
    bi.role,
    bi.status,
    bi.invite_token,
    bi.created_at
  FROM dearbaby.baby_invites bi
  WHERE bi.id = v_invite_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION dearbaby.create_baby_invite TO authenticated;

-- -----------------------------------------------------------------------------
-- 2. FIX: Update accept_baby_invite RPC to update status to 'accepted'
-- -----------------------------------------------------------------------------
-- This RPC accepts the invite and adds the user to the baby's family

CREATE OR REPLACE FUNCTION dearbaby.accept_baby_invite(
  p_token TEXT
)
RETURNS TABLE (
  baby_id UUID,
  baby_name TEXT,
  role TEXT
)
SECURITY DEFINER
SET search_path = dearbaby, public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
  v_invite_record RECORD;
BEGIN
  -- Get the current user's ID
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to accept an invite';
  END IF;

  -- Find the invite by token
  SELECT * INTO v_invite_record
  FROM dearbaby.baby_invites
  WHERE invite_token = p_token
  AND status = 'pending';

  IF v_invite_record IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invite token';
  END IF;

  -- Check if invite is expired (e.g., 7 days old)
  IF v_invite_record.created_at < NOW() - INTERVAL '7 days' THEN
    -- Update the invite status to expired
    UPDATE dearbaby.baby_invites
    SET status = 'expired', updated_at = NOW()
    WHERE id = v_invite_record.id;

    RAISE EXCEPTION 'This invite has expired';
  END IF;

  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM dearbaby.parent_baby
    WHERE user_id = v_user_id
    AND baby_id = v_invite_record.baby_id
  ) THEN
    -- User already has access, just mark invite as accepted
    UPDATE dearbaby.baby_invites
    SET status = 'accepted', updated_at = NOW()
    WHERE id = v_invite_record.id;

    -- Return the baby info
    RETURN QUERY
    SELECT
      b.id as baby_id,
      b.name as baby_name,
      v_invite_record.role
    FROM dearbaby.babies b
    WHERE b.id = v_invite_record.baby_id;

    RETURN;
  END IF;

  -- Add the user to the baby's family
  INSERT INTO dearbaby.parent_baby (
    user_id,
    baby_id,
    role,
    created_at
  ) VALUES (
    v_user_id,
    v_invite_record.baby_id,
    v_invite_record.role,
    NOW()
  );

  -- Update the invite status to accepted
  UPDATE dearbaby.baby_invites
  SET
    status = 'accepted',
    accepted_at = NOW(),
    accepted_by = v_user_id,
    updated_at = NOW()
  WHERE id = v_invite_record.id;

  -- Return the baby info
  RETURN QUERY
  SELECT
    b.id as baby_id,
    b.name as baby_name,
    v_invite_record.role
  FROM dearbaby.babies b
  WHERE b.id = v_invite_record.baby_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION dearbaby.accept_baby_invite TO authenticated;

-- -----------------------------------------------------------------------------
-- 3. OPTIONAL: Add columns if they don't exist
-- -----------------------------------------------------------------------------
-- Run this only if your baby_invites table is missing these columns

-- Check if accepted_at column exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'dearbaby'
    AND table_name = 'baby_invites'
    AND column_name = 'accepted_at'
  ) THEN
    ALTER TABLE dearbaby.baby_invites ADD COLUMN accepted_at TIMESTAMPTZ;
  END IF;
END $$;

-- Check if accepted_by column exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'dearbaby'
    AND table_name = 'baby_invites'
    AND column_name = 'accepted_by'
  ) THEN
    ALTER TABLE dearbaby.baby_invites ADD COLUMN accepted_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Check if updated_at column exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'dearbaby'
    AND table_name = 'baby_invites'
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE dearbaby.baby_invites ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 4. VERIFICATION QUERIES
-- -----------------------------------------------------------------------------
-- Run these to verify your setup

-- Check baby_invites table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'dearbaby'
AND table_name = 'baby_invites'
ORDER BY ordinal_position;

-- Check existing invites
SELECT
  id,
  baby_id,
  invited_email,
  role,
  status,
  invite_email_sent,
  created_at,
  accepted_at
FROM dearbaby.baby_invites
ORDER BY created_at DESC
LIMIT 10;
