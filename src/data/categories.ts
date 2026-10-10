export type Group = 'Income' | 'Expense' | 'Funding';
export type Bucket = 'Essentials' | 'Lifestyle' | 'Travel' | 'Business' | 'People & events';

export type Category = {
  name: string;
  group: Group;
  bucket?: Bucket;
  step1?: number;
  step2?: number;
  emoji: string;
};

export const CATEGORIES: Category[] = [
  { name: 'Salary / employment', group: 'Income', emoji: '💼' },
  { name: 'Business income (typewriting & sales)', group: 'Income', emoji: '⌨️' },
  { name: 'Second-hand sales (Vinted)', group: 'Income', emoji: '👗' },
  { name: 'Gifts & family support', group: 'Income', emoji: '🎁' },
  { name: 'Money from Josh', group: 'Income', emoji: '💌' },
  { name: 'Refunds & deposits returned', group: 'Income', emoji: '↩️' },
  { name: 'Other income', group: 'Income', emoji: '✨' },

  { name: 'Rent & housing', group: 'Expense', bucket: 'Essentials', step1: 350, step2: 350, emoji: '🏠' },
  { name: 'Groceries & household', group: 'Expense', bucket: 'Essentials', step1: 350, step2: 320, emoji: '🧺' },
  { name: 'Health & pharmacy', group: 'Expense', bucket: 'Essentials', step1: 50, step2: 45, emoji: '💊' },
  { name: 'Transport (local)', group: 'Expense', bucket: 'Essentials', step1: 70, step2: 60, emoji: '🚌' },
  { name: 'Subscriptions, apps & phone', group: 'Expense', bucket: 'Essentials', step1: 45, step2: 40, emoji: '📱' },
  { name: 'Admin, fees & government', group: 'Expense', bucket: 'Essentials', step1: 20, step2: 20, emoji: '📮' },

  { name: 'Eating out & cafés', group: 'Expense', bucket: 'Lifestyle', step1: 150, step2: 120, emoji: '☕' },
  { name: 'Shopping & clothing', group: 'Expense', bucket: 'Lifestyle', step1: 150, step2: 100, emoji: '🛍️' },
  { name: 'Personal care & beauty', group: 'Expense', bucket: 'Lifestyle', step1: 25, step2: 25, emoji: '💅' },
  { name: 'Entertainment & outings', group: 'Expense', bucket: 'Lifestyle', step1: 25, step2: 20, emoji: '🎬' },
  { name: 'Books & stationery', group: 'Expense', bucket: 'Lifestyle', step1: 15, step2: 10, emoji: '📚' },
  { name: 'Courses, fitness & learning', group: 'Expense', bucket: 'Lifestyle', step1: 100, step2: 80, emoji: '🧘' },
  { name: 'Gifts & donations', group: 'Expense', bucket: 'Lifestyle', step1: 10, step2: 10, emoji: '💝' },
  { name: 'Cash withdrawals', group: 'Expense', bucket: 'Lifestyle', step1: 25, step2: 25, emoji: '💶' },

  { name: 'Travel – flights & long-distance', group: 'Expense', bucket: 'Travel', step1: 150, step2: 100, emoji: '✈️' },
  { name: 'Travel – accommodation', group: 'Expense', bucket: 'Travel', step1: 100, step2: 70, emoji: '🛏️' },
  { name: 'Travel – activities & extras', group: 'Expense', bucket: 'Travel', step1: 50, step2: 30, emoji: '🗺️' },

  { name: 'Business & website costs', group: 'Expense', bucket: 'Business', step1: 75, step2: 75, emoji: '🖥️' },

  { name: 'Wedding', group: 'Expense', bucket: 'People & events', step1: 0, step2: 0, emoji: '💍' },
  { name: 'Paid to Josh', group: 'Expense', bucket: 'People & events', step1: 0, step2: 0, emoji: '💗' },
  { name: 'Transfers to people', group: 'Expense', bucket: 'People & events', step1: 0, step2: 0, emoji: '🤝' },
  { name: 'Other / review', group: 'Expense', bucket: 'People & events', step1: 0, step2: 0, emoji: '❓' },

  { name: 'Transfers from own accounts', group: 'Funding', emoji: '🐷' },
  { name: 'Transfers to own accounts', group: 'Funding', emoji: '🏦' },
];

export const BUCKETS: Bucket[] = ['Essentials', 'Lifestyle', 'Travel', 'Business', 'People & events'];

export const BY_NAME = new Map(CATEGORIES.map((c) => [c.name, c]));
export const EXPENSE_CATEGORIES = CATEGORIES.filter((c) => c.group === 'Expense');

export const REVIEW = 'Other / review';
export const BUSINESS_INCOME = 'Business income (typewriting & sales)';
export const FROM_OWN = 'Transfers from own accounts';

export const presetTargets = (step: 'step1' | 'step2'): Record<string, number> =>
  Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c.name, c[step] ?? 0]));
