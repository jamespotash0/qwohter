-- Update log_invite_attempt function to mark token as used when successful
-- This ensures the token is updated even if RLS blocks client-side updates

CREATE OR REPLACE FUNCTION log_invite_attempt(
  p_ip_address INET,
  p_user_id UUID,
  p_invite_token TEXT,
  p_success BOOLEAN,
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_attempt_id UUID;
BEGIN
  -- Log the attempt
  INSERT INTO invite_token_attempts (
    ip_address,
    user_id,
    invite_token,
    success,
    error_message
  ) VALUES (
    p_ip_address,
    p_user_id,
    p_invite_token,
    p_success,
    p_error_message
  )
  RETURNING id INTO v_attempt_id;

  -- If attempt was successful, mark the token as used
  -- Using SECURITY DEFINER allows this to bypass RLS
  IF p_success THEN
    UPDATE invite_tokens
    SET is_used = TRUE
    WHERE token = p_invite_token;
  END IF;

  RETURN v_attempt_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: SECURITY DEFINER allows this function to update invite_tokens
-- even when RLS would normally block it. This is safe because:
-- 1. Only called after successful validation
-- 2. Only updates is_used flag (no other data)
-- 3. Prevents orphaned invite tokens when RLS blocks client updates
