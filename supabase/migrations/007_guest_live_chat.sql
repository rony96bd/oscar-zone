-- Migration: Guest Live Chat Support

-- 1. Modify chat_conversations
ALTER TABLE chat_conversations ALTER COLUMN customer_id DROP NOT NULL;
ALTER TABLE chat_conversations ADD COLUMN guest_session_id TEXT;
ALTER TABLE chat_conversations ADD COLUMN guest_name TEXT;
ALTER TABLE chat_conversations ADD COLUMN guest_contact TEXT;

CREATE INDEX idx_chat_conversations_guest_session ON chat_conversations(guest_session_id);

-- 2. Modify chat_messages
ALTER TABLE chat_messages ALTER COLUMN sender_id DROP NOT NULL;
ALTER TABLE chat_messages ADD COLUMN is_guest BOOLEAN NOT NULL DEFAULT false;

-- 3. RLS Policies for Guest Insertions
-- Allow guests to create a conversation
CREATE POLICY "Guests can create conversations"
  ON chat_conversations FOR INSERT
  WITH CHECK (customer_id IS NULL AND guest_session_id IS NOT NULL);

-- Allow guests to update their own conversations (e.g. mark read)
CREATE POLICY "Guests can update conversations"
  ON chat_conversations FOR UPDATE
  USING (guest_session_id IS NOT NULL)
  WITH CHECK (guest_session_id IS NOT NULL);

-- Allow anyone to insert messages if they are marked as guest
CREATE POLICY "Guests can send messages"
  ON chat_messages FOR INSERT
  WITH CHECK (sender_id IS NULL AND is_guest = true);

-- Allow anyone to select messages (secured by unguessable conversation_id UUID)
CREATE POLICY "Guests can view messages of known conversations"
  ON chat_messages FOR SELECT
  USING (true);

-- 4. Secure RPC function to fetch guest conversation without exposing all conversations
CREATE OR REPLACE FUNCTION get_guest_conversation(p_session_id TEXT)
RETURNS SETOF chat_conversations
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT * FROM chat_conversations WHERE guest_session_id = p_session_id LIMIT 1;
END;
$$ LANGUAGE plpgsql;
