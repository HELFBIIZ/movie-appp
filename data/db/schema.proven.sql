CREATE TABLE roles (
  id   TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,          -- USER | MODERATOR | ADMIN | SUPER_ADMIN
  name TEXT NOT NULL
);
CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,        -- scrypt$salt$hash — never plaintext
  role_id       TEXT NOT NULL DEFAULT 'r_user' REFERENCES roles(id),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at    TEXT
);
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_users_deleted ON users(deleted_at);
CREATE TABLE profiles (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  avatar_url   TEXT,
  display_name TEXT,
  bio          TEXT,
  theme        TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE sessions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,   -- sha256 of raw session token; never raw
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE session_tokens (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_session_user  ON session_tokens(user_id, expires_at);
CREATE INDEX idx_session_expir ON session_tokens(expires_at);
CREATE TABLE subscription_plans (
  id            TEXT PRIMARY KEY,
  code          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  price_mnt     INTEGER NOT NULL,
  duration_days INTEGER NOT NULL,
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE subscriptions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id    TEXT NOT NULL REFERENCES subscription_plans(id),
  status     TEXT NOT NULL DEFAULT 'PENDING',
  start_date TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);