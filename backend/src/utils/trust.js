import { Transaction } from '../models/Transaction.js';
import { EXPENSE_CATEGORIES } from '../models/Transaction.js';

/**
 * Erosion-of-trust style checks: data quality and simple consistency signals.
 */
export async function evaluateDataTrust(userId) {
  const warnings = [];

  const missingCategory = await Transaction.countDocuments({
    userId,
    type: 'expense',
    $or: [{ category: '' }, { category: { $exists: false } }],
  });
  if (missingCategory > 0) {
    warnings.push({
      code: 'MISSING_CATEGORY',
      severity: 'high',
      message: `${missingCategory} expense(s) have no category. Totals by category may be unreliable.`,
    });
  }

  const invalidCategory = await Transaction.countDocuments({
    userId,
    type: 'expense',
    category: { $nin: [...EXPENSE_CATEGORIES, ''] },
  });
  if (invalidCategory > 0) {
    warnings.push({
      code: 'NON_STANDARD_CATEGORY',
      severity: 'medium',
      message: `${invalidCategory} expense(s) use a non-standard category. Reports may not align with budgets.`,
    });
  }

  const agg = await Transaction.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: '$type',
        sum: { $sum: '$amount' },
      },
    },
  ]);
  const byType = Object.fromEntries(agg.map((a) => [a._id, a.sum]));
  const expenseSum = byType.expense || 0;
  const incomeSum = byType.income || 0;
  const balance = Math.round((incomeSum - expenseSum) * 100) / 100;

  /** Compare expense total vs sum of category buckets (catches stale or bad categorization). */
  const catSum = await Transaction.aggregate([
    { $match: { userId, type: 'expense' } },
    { $group: { _id: null, sum: { $sum: '$amount' } } },
  ]);
  const uncategorizedSum = await Transaction.aggregate([
    {
      $match: {
        userId,
        type: 'expense',
        $or: [{ category: '' }, { category: { $exists: false } }],
      },
    },
    { $group: { _id: null, sum: { $sum: '$amount' } } },
  ]);
  const totalFromCats = catSum[0]?.sum || 0;
  const unc = uncategorizedSum[0]?.sum || 0;
  if (unc > 0 && unc / totalFromCats > 0.2) {
    warnings.push({
      code: 'HIGH_UNCATEGORIZED_SHARE',
      severity: 'medium',
      message: 'A large share of spending is uncategorized. Charts and budgets may be misleading.',
    });
  }

  return {
    healthy: warnings.length === 0,
    warnings,
    summary: {
      totalIncome: Math.round(incomeSum * 100) / 100,
      totalExpense: Math.round(expenseSum * 100) / 100,
      balance,
    },
  };
}
