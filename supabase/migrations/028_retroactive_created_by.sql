DO $$
DECLARE
    admin_id UUID;
BEGIN
    -- Get the first admin or super_admin
    SELECT id INTO admin_id FROM profiles WHERE role IN ('admin', 'super_admin') LIMIT 1;
    
    IF admin_id IS NOT NULL THEN
        -- Backfill cashout_requests just in case
        UPDATE cashout_requests 
        SET processed_by = admin_id 
        WHERE status IN ('approved', 'rejected', 'completed') AND processed_by IS NULL;

        -- Backfill finance_logs
        UPDATE finance_logs 
        SET created_by = admin_id 
        WHERE created_by IS NULL;
        
        -- Backfill game_point_purchases
        UPDATE game_point_purchases 
        SET created_by = admin_id 
        WHERE created_by IS NULL;
    END IF;
END $$;
