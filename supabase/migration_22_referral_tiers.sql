-- Records which tier (Bronze/Silver/Gold) applied when each referral's
-- reward was issued — see src/lib/referralTiers.ts for the thresholds.
-- Existing rows are left null (they were all issued at the flat 15% that
-- was in place before tiering existed).
-- Run once in Supabase's SQL editor. (New installs: schema.sql already
-- includes this, skip this file.)

alter table referrals add column if not exists tier text;
