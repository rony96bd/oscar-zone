-- Add missing columns to accounting_cycles
ALTER TABLE accounting_cycles ADD COLUMN IF NOT EXISTS total_game_points_cost NUMERIC(10,2) DEFAULT 0;
ALTER TABLE accounting_cycles ADD COLUMN IF NOT EXISTS total_expenses NUMERIC(10,2) DEFAULT 0;
