-- ============================================================
-- FREE PLAY REQUESTS
-- ============================================================

CREATE TABLE free_play_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE free_play_requests ENABLE ROW LEVEL SECURITY;

-- Customers can view their own requests
CREATE POLICY "Customers can view their own free play requests"
    ON free_play_requests FOR SELECT
    USING (auth.uid() = user_id);

-- Customers can insert their own requests
CREATE POLICY "Customers can insert their own free play requests"
    ON free_play_requests FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Admins can do everything
CREATE POLICY "Admins can do everything on free play requests"
    ON free_play_requests FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
        )
    );
