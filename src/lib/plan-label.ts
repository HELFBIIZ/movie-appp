export function planLabel(plan: { code: string; name: string }): string {
  if (/[А-Яа-яӨөҮү]/.test(plan.name)) return plan.name;
  if (plan.code === 'WEEKLY') return '7 хоногийн эрх';
  if (plan.code === 'MONTHLY') return 'Сарын эрх';
  const months = /^MONTHLY_(\d{1,2})$/.exec(plan.code)?.[1];
  return months ? `${months} сарын эрх` : plan.name;
}
