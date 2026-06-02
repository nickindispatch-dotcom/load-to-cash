-- Add new fields to loads table for manual entry
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS mc_number text default '';
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS phone_number text default '';
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS my_charge_pct numeric default 0;
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS my_charge_amount numeric default 0;
