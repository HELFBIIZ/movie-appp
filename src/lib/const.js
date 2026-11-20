// src/lib/const.js — typed constant sets. Prisma contract keeps every
// "enum-like" column a String constrained to these sets server-side (SQLite
// connector disallows native enums). The SAME sets validate on PostgreSQL.
// Only server routes import this — never ship it to the browser bundle.

export const ROLE_CODES = Object.freeze(['USER', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN'])

export const SUBSCRIPTION_STATUSES = Object.freeze(['PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'SUSPENDED'])

export const PLAN_CODES = Object.freeze([
  'WEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL',
  'MONTHLY_2', 'MONTHLY_3', 'MONTHLY_4', 'MONTHLY_5', 'MONTHLY_6',
  'MONTHLY_7', 'MONTHLY_8', 'MONTHLY_9',
  'XP_PASS_7_DAYS', 'XP_PASS_30_DAYS',
])

export const PAYMENT_PROVIDERS = Object.freeze(['qpay', 'hm', 'bank', 'local_dev'])

export const PAYMENT_STATUSES = Object.freeze(['PENDING', 'PROCESSING', 'SUCCESSFUL', 'FAILED', 'CANCELLED', 'REFUNDED'])

export const REWARD_TYPES = Object.freeze(['feature', 'badge', 'theme', 'title', 'cosmetic'])

export const XP_ACTIVITIES = Object.freeze([
  'SIGNUP', 'DAILY_LOGIN', 'VIDEO_VIEW', 'SUBTITLE_HELP', 'RATING', 'REVIEW',
  'SHARE_REF', 'PROFILE_PIC', 'SUBSCRIBE', 'XP_REDEEM', 'ACHIEVEMENT', 'ADMIN_ADJUST',
])

export const SECURITY_LOG_TYPES = Object.freeze([
  'login-success', 'login-failed', 'password-reset', 'payment-verify', 'redeem', 'suspicious',
])