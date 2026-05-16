import mongoose from 'mongoose';
import { Transaction } from '../models/Transaction.js';

const oid = (id) => new mongoose.Types.ObjectId(id);

/**
 * Builds simple rule-based insights (no ML): month-over-month, top category, etc.
 */
export async function buildInsights(userId, now = new Date()) {
  const startThis = new Date(now.getFullYear(), now.getMonth(), 1);
  const startLast = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endLast = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const [thisMonth, lastMonth] = await Promise.all([
    aggregateMonth(userId, startThis, now),
    aggregateMonth(userId, startLast, endLast),
  ]);

  const insights = [];

  const topThis = maxKey(thisMonth.byCategory);
  if (topThis) {
    insights.push({
      type: 'top_category',
      severity: 'info',
      message: `Your highest spending category this month is ${topThis}.`,
    });
  }

  for (const cat of Object.keys(thisMonth.byCategory)) {
    const cur = thisMonth.byCategory[cat] || 0;
    const prev = lastMonth.byCategory[cat] || 0;
    if (prev > 0 && cur > prev * 1.25) {
      const pct = Math.round(((cur - prev) / prev) * 100);
      insights.push({
        type: 'spike',
        severity: 'warning',
        category: cat,
        message: `You spent ${pct}% more on ${cat} this month than last month.`,
      });
    }
  }

  if (thisMonth.totalExpense > 0 && lastMonth.totalExpense > 0) {
    const delta =
      ((thisMonth.totalExpense - lastMonth.totalExpense) / lastMonth.totalExpense) * 100;
    if (Math.abs(delta) >= 10) {
      insights.push({
        type: 'total_trend',
        severity: delta > 0 ? 'warning' : 'info',
        message:
          delta > 0
            ? `Overall spending is up ${Math.round(delta)}% vs last month.`
            : `Overall spending is down ${Math.round(Math.abs(delta))}% vs last month.`,
      });
    }
  }

  return {
    period: { thisMonth: { start: startThis, end: now }, lastMonth: { start: startLast, end: endLast } },
    totals: { thisMonth, lastMonth },
    insights,
  };
}

async function aggregateMonth(userId, from, to) {
  const rows = await Transaction.aggregate([
    {
      $match: {
        userId: oid(userId),
        type: 'expense',
        date: { $gte: from, $lte: to },
      },
    },
    {
      $group: {
        _id: '$category',
        sum: { $sum: '$amount' },
      },
    },
  ]);

  const byCategory = {};
  let totalExpense = 0;
  for (const r of rows) {
    const cat = r._id || 'Uncategorized';
    byCategory[cat] = Math.round(r.sum * 100) / 100;
    totalExpense += r.sum;
  }

  const incomeRows = await Transaction.aggregate([
    {
      $match: {
        userId: oid(userId),
        type: 'income',
        date: { $gte: from, $lte: to },
      },
    },
    { $group: { _id: null, sum: { $sum: '$amount' } } },
  ]);
  const totalIncome = incomeRows[0]?.sum || 0;

  return {
    totalExpense: Math.round(totalExpense * 100) / 100,
    totalIncome: Math.round(totalIncome * 100) / 100,
    byCategory,
  };
}

function maxKey(obj) {
  let best = null;
  let max = -1;
  for (const [k, v] of Object.entries(obj)) {
    if (v > max) {
      max = v;
      best = k;
    }
  }
  return best;
}
