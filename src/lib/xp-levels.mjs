const XP_LEVELS = [0, 100, 250, 500, 900, 1500, 2400, 3600, 5200, 7500];
const RANKS = [
  'Шинэ үзэгч',
  'Кино сонирхогч',
  'Хадмал сурагч',
  'Үг анчир',
  'Сцене шинжээч',
  'Алтан дэлгэц',
  'Кино мастер',
  'Домогт үзэгч',
  'VXNTA од',
];

export function levelForXp(xp) {
  const value = Math.max(0, Number(xp) || 0);
  let level = 1;
  for (const threshold of XP_LEVELS) if (value >= threshold) level++;
  if (value >= XP_LEVELS[XP_LEVELS.length - 1]) {
    level += Math.floor((value - XP_LEVELS[XP_LEVELS.length - 1]) / 1500);
  }
  return level;
}

export function rankForLevel(level) {
  const safe = Math.max(1, Math.floor(Number(level) || 1));
  return RANKS[Math.min(safe - 1, RANKS.length - 1)];
}

export function levelProgress(xp) {
  const value = Math.max(0, Number(xp) || 0);
  const level = levelForXp(value);
  const index = Math.min(level - 2, XP_LEVELS.length - 1);
  const floor = index >= 0 ? XP_LEVELS[index] : 0;
  const next = index + 1 < XP_LEVELS.length ? XP_LEVELS[index + 1] : floor + 1500;
  return {
    level,
    current: value,
    floor,
    next,
    progress: Math.min(1, (value - floor) / Math.max(1, next - floor)),
  };
}
