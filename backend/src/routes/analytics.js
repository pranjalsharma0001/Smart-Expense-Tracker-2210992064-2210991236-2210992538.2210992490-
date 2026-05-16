import { Router } from 'express';
import { query, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { Transaction } from '../models/Transaction.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

router.get(
  '/summary',
  [
    query('from').optional().isISO8601(),
    query('to').optional().isISO8601(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const match = { userId: new mongoose.Types.ObjectId(req.userId) };
    if (req.query.from || req.query.to) {
      match.date = {};
      if (req.query.from) match.date.$gte = new Date(req.query.from);
      if (req.query.to) match.date.$lte = new Date(req.query.to);
    }

    const byType = await Transaction.aggregate([
      { $match: match },
      { $group: { _id: '$type', total: { $sum: '$amount' } } },
    ]);
    const expense = byType.find((x) => x._id === 'expense')?.total || 0;
    const income = byType.find((x) => x._id === 'income')?.total || 0;

    const byCategory = await Transaction.aggregate([
      { $match: { ...match, type: 'expense' } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
    ]);

    return res.json({
      totalExpense: Math.round(expense * 100) / 100,
      totalIncome: Math.round(income * 100) / 100,
      balance: Math.round((income - expense) * 100) / 100,
      byCategory: Object.fromEntries(
        byCategory.map((c) => [c._id || 'Uncategorized', Math.round(c.total * 100) / 100])
      ),
    });
  }
);

/** Weekly totals for charts (last N weeks) */
router.get('/weekly', async (req, res) => {
  const now = new Date();
  const weeks = Math.min(Number(req.query.weeks) || 8, 52);
  const start = new Date(now);
  start.setDate(start.getDate() - weeks * 7);
  start.setHours(0, 0, 0, 0);

  const rows = await Transaction.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(req.userId),
        type: 'expense',
        date: { $gte: start, $lte: now },
      },
    },
    {
      $group: {
        _id: {
          y: { $isoWeekYear: '$date' },
          w: { $isoWeek: '$date' },
        },
        total: { $sum: '$amount' },
      },
    },
    { $sort: { '_id.y': 1, '_id.w': 1 } },
  ]);

  return res.json(
    rows.map((r) => ({
      year: r._id.y,
      week: r._id.w,
      label: `W${r._id.w} ${r._id.y}`,
      total: Math.round(r.total * 100) / 100,
    }))
  );
});

/** Monthly totals for line chart (last N months) */
router.get('/monthly', async (req, res) => {
  const months = Math.min(Number(req.query.months) || 12, 36);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const rows = await Transaction.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(req.userId),
        type: 'expense',
        date: { $gte: start, $lte: now },
      },
    },
    {
      $group: {
        _id: {
          y: { $year: '$date' },
          m: { $month: '$date' },
        },
        total: { $sum: '$amount' },
      },
    },
    { $sort: { '_id.y': 1, '_id.m': 1 } },
  ]);

  return res.json(
    rows.map((r) => ({
      year: r._id.y,
      month: r._id.m,
      label: `${r._id.y}-${String(r._id.m).padStart(2, '0')}`,
      total: Math.round(r.total * 100) / 100,
    }))
  );
});

export default router;
