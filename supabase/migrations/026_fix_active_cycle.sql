DO $$
DECLARE
    active_count INT;
    last_closed_date TIMESTAMPTZ;
BEGIN
    SELECT COUNT(*) INTO active_count FROM accounting_cycles WHERE status = 'active';
    
    IF active_count = 0 THEN
        -- Find the last closed cycle's end date
        SELECT end_date INTO last_closed_date FROM accounting_cycles WHERE status = 'closed' ORDER BY end_date DESC LIMIT 1;
        
        IF last_closed_date IS NULL THEN
            last_closed_date := NOW() - INTERVAL '1 month'; -- Fallback
        END IF;
        
        -- Insert a new active cycle
        INSERT INTO accounting_cycles (start_date, status) VALUES (last_closed_date, 'active');
    END IF;
END $$;
