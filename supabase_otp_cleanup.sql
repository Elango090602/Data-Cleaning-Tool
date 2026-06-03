-- ====================================================================
-- SUPABASE OTP CLEANUP SCRIPTS
-- ====================================================================
--
-- Choose ONE of the two options below to automatically delete expired
-- OTP codes from the `otp_verifications` table in your Supabase database.
-- Run these commands directly inside your Supabase SQL Editor.
--

-- --------------------------------------------------------------------
-- OPTION 1: Automatic DB Trigger on Insert (Recommended & Self-Contained)
-- --------------------------------------------------------------------
-- This option sets up a PostgreSQL trigger that executes whenever a new
-- OTP is generated, automatically cleaning up all expired OTPs in the table.
-- It requires zero extra extensions or server configuration.

-- 1. Create the cleanup function
CREATE OR REPLACE FUNCTION clean_expired_otps_trigger()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM otp_verifications WHERE expires_at < NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create the trigger
DROP TRIGGER IF EXISTS trg_clean_expired_otps ON otp_verifications;
CREATE TRIGGER trg_clean_expired_otps
AFTER INSERT ON otp_verifications
FOR EACH STATEMENT
EXECUTE FUNCTION clean_expired_otps_trigger();


-- --------------------------------------------------------------------
-- OPTION 2: Cron Job via pg_cron (Alternative)
-- --------------------------------------------------------------------
-- This option schedules an asynchronous cron job that runs every 5 minutes
-- to prune expired OTP records. Useful if you want cleanup to happen 
-- independently of user login activity.

-- 1. Enable the pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Schedule the cleanup job to run every 5 minutes
SELECT cron.schedule(
    'delete-expired-otps',
    '*/5 * * * *',
    $$ DELETE FROM otp_verifications WHERE expires_at < NOW() $$
);
