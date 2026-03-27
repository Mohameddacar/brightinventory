-- This migration was originally used to reconcile drift in an existing database.
-- Keep it as a no-op to ensure future shadow database replays are deterministic
-- and do not attempt duplicate DDL on clean databases.
SELECT 1;
