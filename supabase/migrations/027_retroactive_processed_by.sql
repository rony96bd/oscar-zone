DO $$
DECLARE
    admin_id UUID;
BEGIN
    -- Get the first admin or super_admin
    SELECT id INTO admin_id FROM profiles WHERE role IN ('admin', 'super_admin') LIMIT 1;
    
    IF admin_id IS NOT NULL THEN
        -- Update existing completed/rejected orders to be processed by this admin
        UPDATE orders 
        SET processed_by = admin_id 
        WHERE status IN ('completed', 'rejected') AND processed_by IS NULL;
        
        -- Update existing approved/rejected cashouts to be processed by this admin
        UPDATE cashout_requests 
        SET processed_by = admin_id 
        WHERE status IN ('approved', 'rejected', 'completed') AND processed_by IS NULL;
    END IF;
END $$;
