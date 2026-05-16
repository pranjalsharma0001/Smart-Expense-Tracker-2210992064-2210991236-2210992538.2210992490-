import { EXPENSE_CATEGORIES } from '../models/Transaction.js';

/**
 * Keyword → category rules (first match wins, case-insensitive).
 */
const RULES = [
  { category: 'Food', keywords: ['restaurant', 'cafe', 'coffee', 'grocery', 'food', 'lunch', 'dinner', 'uber eats', 'zomato', 'swiggy', 'pizza', 'burger'] },
  { category: 'Travel', keywords: ['uber', 'lyft', 'taxi', 'flight', 'train', 'bus', 'fuel', 'gas', 'parking', 'hotel', 'travel'] },
  { category: 'Bills', keywords: ['electric', 'water', 'internet', 'rent', 'subscription', 'insurance', 'bill', 'utility'] },
  { category: 'Entertainment', keywords: ['movie', 'netflix', 'spotify', 'game', 'concert', 'theatre', 'streaming'] },
  { category: 'Shopping', keywords: ['amazon', 'mall', 'clothes', 'electronics', 'shopping', 'store', 'retail'] },
];

/**
 * Returns a suggested category from description, or null if no rule matches.
 */
export function suggestCategoryFromText(text) {
  if (!text || typeof text !== 'string') return null;
  const lower = text.toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some((k) => lower.includes(k))) {
      return rule.category;
    }
  }
  return null;
}

export function isValidExpenseCategory(category) {
  return EXPENSE_CATEGORIES.includes(category);
}
