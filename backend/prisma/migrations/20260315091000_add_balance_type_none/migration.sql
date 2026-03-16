DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'BalanceType' AND e.enumlabel = 'none'
  ) THEN
    ALTER TYPE "BalanceType" ADD VALUE 'none';
  END IF;
END
$$;
