-- data/db/seeds.sql — idempotent seed data, executed AFTER schema.sql on boot
-- (db.mjs open()). Kept OUT of schema.sql because that file is auto-emitted
-- from the live DB by scripts/capture-schema.mjs (DDL only). INSERT OR IGNORE
-- makes re-boot on an existing DB a no-op.

-- Roles drive createUser's role lookup (createUser: SELECT id FROM roles WHERE code='USER').
INSERT OR IGNORE INTO roles (id, code, name) VALUES
  ('r_user',  'USER',        'User'),
  ('r_mod',   'MODERATOR',   'Moderator'),
  ('r_admin', 'ADMIN',       'Admin'),
  ('r_super', 'SUPER_ADMIN', 'Super Admin');

-- Paid plans are the canWatch gate; XP-pass plans are zero-price anchors used
-- by XP→VIP redemption (grantVipPass / redeemReward).
INSERT OR IGNORE INTO subscription_plans (id, code, name, price_mnt, duration_days, is_active) VALUES
  ('pl_week',   'WEEKLY',        'Weekly Unlimited',         1500,  7,   1),
  ('pl_month',  'MONTHLY',       'Monthly Unlimited',        5900,  30,  1),
  ('pl_quarter','QUARTERLY',     'Quarterly Unlimited',      15900, 90,  1),
  ('pl_semi',   'SEMI_ANNUAL',   'Semi-annual Unlimited',    29900, 180, 1),
  ('pl_year',   'ANNUAL',        'Yearly Unlimited',         56900, 365, 1),
  ('pl_xp7',    'XP_PASS_7_DAYS','VIP Pass (7 days)',        0,     7,   1),
  ('pl_xp30',   'XP_PASS_30_DAYS','VIP Pass (30 days)',      0,     30,  1);

-- XP shop catalog. `feature` rewards with days>0 grant a VIP pass on redeem.
INSERT OR IGNORE INTO rewards (id, code, type, name, description, xp_price, days, is_active) VALUES
  ('rd_xp7',  'XP_PASS_7',  'feature',   'VIP Pass 7 days',   '7 days of unlimited VIP access',  2000, 7,  1),
  ('rd_xp30', 'XP_PASS_30', 'feature',   'VIP Pass 30 days',  '30 days of unlimited VIP access', 5000, 30, 1),
  ('rd_badge_otaku', 'BADGE_OTAKU',     'badge',    'Otaku badge',    'Early bird movie binge badge',     1200, 0, 1),
  ('rd_theme_cinema', 'THEME_CINEMA',   'theme',    'Cinema theme',   'Gold-accent cinema UI theme',      1000, 0, 1),
  ('rd_title_cinephile', 'TITLE_CINEPHILE', 'title', 'Cinephile title', 'Show a Cinephile tag on your profile', 1500, 0, 1),
  ('rd_avatar_aurora', 'AVATAR_AURORA', 'cosmetic', 'Aurora avatar',  'Aurora gradient profile avatar',   800,  0, 1);