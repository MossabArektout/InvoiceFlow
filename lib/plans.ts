export type UserPlan = 'free' | 'creator' | 'pro';

export const PLAN_EXPORT_LIMITS: Record<UserPlan, number> = {
  free: 5,
  creator: 40,
  pro: 150
};

export const FREE_INVOICE_LIMIT = 5;
export const FREE_CLIENT_LIMIT = 5;

export const normalizePlan = (plan: string | null | undefined): UserPlan => {
  if (plan === 'creator' || plan === 'pro') return plan;
  return 'free';
};

export const getRemainingExports = (plan: UserPlan, exportsThisMonth: number) => {
  const limit = PLAN_EXPORT_LIMITS[plan];
  return Math.max(0, limit - Math.max(0, exportsThisMonth));
};
