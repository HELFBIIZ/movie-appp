-- movie-app live schema — MIRRORED VERBATIM from the running app.db
-- (sqlite_master = single source of truth; Prisma contract lives in
--  prisma/schema.prisma as the provider-agnostic twin).
-- Auto-emitted, idempotent. Someone hand-SQL-ing over this in prod will be reverted.

CREATE TABLE IF NOT EXISTS roles (
  id   TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,          -- USER | MODERATOR | ADMIN | SUPER_ADMIN
  name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,        -- scrypt$salt$hash — never plaintext
  role_id       TEXT NOT NULL DEFAULT 'r_user' REFERENCES roles(id),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at    TEXT
);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_deleted ON users(deleted_at);
CREATE TABLE IF NOT EXISTS profiles (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  avatar_url   TEXT,
  display_name TEXT,
  bio          TEXT,
  theme        TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,   -- sha256 of raw session token; never raw
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS session_tokens (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_session_user  ON session_tokens(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_session_expir ON session_tokens(expires_at);
CREATE TABLE IF NOT EXISTS subscription_plans (
  id            TEXT PRIMARY KEY,
  code          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  price_mnt     INTEGER NOT NULL,
  duration_days INTEGER NOT NULL,
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS subscriptions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id    TEXT NOT NULL REFERENCES subscription_plans(id),
  status     TEXT NOT NULL DEFAULT 'PENDING',
  start_date TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- XP + streaks — appended because createUser's XP grant prepares against them
-- (db.mjs:110). Idempotent, same boot rule as everything else.
CREATE TABLE IF NOT EXISTS xp_accounts (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  xp              INTEGER NOT NULL DEFAULT 0,
  level           INTEGER NOT NULL DEFAULT 1,
  streak_days     INTEGER NOT NULL DEFAULT 0,
  last_streak_date TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS xp_transactions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity   TEXT NOT NULL,
  amount     INTEGER NOT NULL,
  reason     TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_xp_tx_user ON xp_transactions(user_id, created_at);
CREATE TABLE IF NOT EXISTS login_streaks (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  current         INTEGER NOT NULL DEFAULT 0,
  best            INTEGER NOT NULL DEFAULT 0,
  last_login_date TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── MONETIZATION × GAMIFICATION × SECURITY — mirrored 1:1 from prisma models
-- ── (Payment, PaymentMethod, Reward, UserReward, XpRedemption, WatchHistory,
-- ──  SecurityLog). `reviews` is app-only (not in prisma yet). Authored here so
-- ── a fresh boot (db.mjs open()) has the FULL surface, not just auth/xp.
CREATE TABLE IF NOT EXISTS payments (
  id           TEXT PRIMARY KEY,
  txn_id       TEXT NOT NULL UNIQUE,      -- merchant txn id we hand the gateway
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id      TEXT NOT NULL REFERENCES subscription_plans(id),
  amount_mnt   INTEGER NOT NULL,
  currency     TEXT NOT NULL DEFAULT 'MNT',
  status       TEXT NOT NULL DEFAULT 'PENDING',  -- PENDING|PROCESSING|SUCCESSFUL|FAILED|CANCELLED|REFUNDED
  provider     TEXT NOT NULL DEFAULT 'local_dev',-- qpay|hm|bank|local_dev
  provider_ref TEXT,                      -- gateway's own payment ref
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  verified_at  TEXT,
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_provider ON payments(provider, status);
CREATE TABLE IF NOT EXISTS payment_methods (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider   TEXT NOT NULL,               -- qpay|hm|bank
  token      TEXT NOT NULL,               -- provider-side token; never PAN/secret
  last4      TEXT,
  brand      TEXT,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_paymethods_user ON payment_methods(user_id);
CREATE TABLE IF NOT EXISTS rewards (
  id          TEXT PRIMARY KEY,
  code        TEXT NOT NULL UNIQUE,
  type        TEXT NOT NULL,              -- feature|badge|theme|title|cosmetic
  name        TEXT NOT NULL,
  description TEXT,
  xp_price    INTEGER NOT NULL DEFAULT 0,
  days        INTEGER NOT NULL DEFAULT 0, -- feature: VIP pass duration
  asset_url   TEXT,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS user_rewards (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_id    TEXT NOT NULL REFERENCES rewards(id),
  purchased_at TEXT NOT NULL DEFAULT (datetime('now')),
  activated    INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, reward_id)
);
CREATE INDEX IF NOT EXISTS idx_user_rewards_user ON user_rewards(user_id);
CREATE TABLE IF NOT EXISTS xp_redemptions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_id  TEXT NOT NULL REFERENCES rewards(id),
  xp_spent   INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_xp_redemptions_user ON xp_redemptions(user_id);
CREATE TABLE IF NOT EXISTS watch_history (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug       TEXT NOT NULL,
  progress   REAL NOT NULL DEFAULT 0,
  completed  INTEGER NOT NULL DEFAULT 0,
  watched_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_watch_user ON watch_history(user_id, watched_at);
CREATE TABLE IF NOT EXISTS security_logs (
  id         TEXT PRIMARY KEY,
  user_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
  type       TEXT NOT NULL,               -- login-success|login-failed|payment-verify|redeem|suspicious
  detail     TEXT,
  ip         TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_security_user ON security_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_security_type ON security_logs(type);
CREATE TABLE IF NOT EXISTS reviews (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug       TEXT NOT NULL,
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text       TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_reviews_slug ON reviews(slug);


-- Manual (Khan Bank) transfer receipts — user submits phone + txn reference +
-- an optional screenshot; an ADMIN approves/rejects to auto-extend VIP.
CREATE TABLE IF NOT EXISTS payment_receipts (
  id          TEXT PRIMARY KEY,
  txn_id      TEXT NOT NULL UNIQUE REFERENCES payments(txn_id),
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone       TEXT NOT NULL,
  note        TEXT,
  image_data  TEXT,                       -- data:image/*;base64 screenshot (browser→DB)
  status      TEXT NOT NULL DEFAULT 'PENDING',  -- PENDING|APPROVED|REJECTED
  admin_note  TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_receipt_user   ON payment_receipts(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_receipt_status ON payment_receipts(status, created_at);

-- In-app notifications (payment received -> admins; approved/rejected -> buyer;
-- QPay auto-detect -> buyer). Created by db.mjs; the bell polls the API.
CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,               -- payment_received|payment_approved|payment_rejected|info
  title      TEXT NOT NULL,
  body       TEXT,
  link       TEXT,
  read_at    TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read_at, created_at);

-- Movies catalog (used by favorites)
CREATE TABLE IF NOT EXISTS movies (
  id    TEXT PRIMARY KEY,
  slug  TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_movies_slug ON movies(slug);

-- Favorites (server-side watchlist)
CREATE TABLE IF NOT EXISTS favorites (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  movie_id   TEXT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, movie_id)
);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id, created_at);

-- Video sources (admin-configured per-movie streams)
CREATE TABLE IF NOT EXISTS video_sources (
  id          TEXT PRIMARY KEY,
  slug        TEXT NOT NULL,
  player      INTEGER NOT NULL,
  source_type TEXT NOT NULL,
  url         TEXT NOT NULL,
  label       TEXT,
  quality     TEXT,
  enabled     INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(slug, player)
);

-- Subtitle tracks (admin-configured)
CREATE TABLE IF NOT EXISTS subtitle_tracks (
  id         TEXT PRIMARY KEY,
  slug       TEXT NOT NULL,
  url        TEXT NOT NULL,
  label      TEXT,
  lang       TEXT NOT NULL DEFAULT 'mn',
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(slug, lang, url)
);

-- Webhook event log (idempotent processing)
CREATE TABLE IF NOT EXISTS webhook_events (
  id        TEXT PRIMARY KEY,
  provider  TEXT NOT NULL,
  type      TEXT,
  payload   TEXT,
  processed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
