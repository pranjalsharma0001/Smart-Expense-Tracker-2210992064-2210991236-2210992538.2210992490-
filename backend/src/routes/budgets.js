import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { Budget } from '../models/Budget.js';
import { Transaction } from '../models/Transaction.js';
import { EXPENSE_CATEGORIES } from '../models/Transaction.js';
import { authRequired } from '../middleware/auth.js';
import { reqUserObjectId } from '../utils/userId.js';

const router = Router();
router.use(authRequired);

function currentPeriod(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** GET /api/budgets?period=2025-03 — spending vs budget per category */
router.get('/', async (req, res) => {
  const period = req.query.period || currentPeriod();
  const [year, month] = period.split('-').map(Number);
  const from = new Date(year, month - 1, 1);
  const to = new Date(year, month, 0, 23, 59, 59, 999);

  const uid = reqUserObjectId(req);
  const budgets = await Budget.find({ userId: uid, period }).lean();
  const agg = await Transaction.aggregate([
    {
      $match: {
        userId: uid,
        type: 'expense',
        date: { $gte: from, $lte: to },
      },
    },
    { $group: { _id: '$category', spent: { $sum: '$amount' } } },
  ]);
  const spentByCat = Object.fromEntries(
    agg.map((a) => [a._id || 'Uncategorized', Math.round(a.spent * 100) / 100])
  );

  const alerts = [];
  const rows = EXPENSE_CATEGORIES.map((category) => {
    const b = budgets.find((x) => x.category === category);
    const limit = b?.limit ?? 0;
    const spent = spentByCat[category] || 0;
    let status = 'ok';
    if (limit > 0) {
      const ratio = spent / limit;
      if (ratio >= 1) {
        status = 'over';
        alerts.push({
          category,
          severity: 'critical',
          message: `Budget exceeded for ${category} (${spent} / ${limit}).`,
        });
      } else if (ratio >= 0.85) {
        status = 'near';
        alerts.push({
          category,
          severity: 'warning',
          message: `Approaching budget limit for ${category} (${Math.round(ratio * 100)}% used).`,
        });
      }
    }
    return {
      category,
      limit,
      spent,
      remaining: limit > 0 ? Math.round((limit - spent) * 100) / 100 : null,
      status,
    };
  });

  return res.json({ period, from, to, rows, alerts });
});

const upsertValidators = [
  body('category').isIn(EXPENSE_CATEGORIES),
  body('limit').isFloat({ min: 0 }),
  body('period').optional().matches(/^\d{4}-\d{2}$/),
];

router.put('/', upsertValidators, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
  }
  const { category, limit, period: bodyPeriod } = req.body;
  const period = bodyPeriod || currentPeriod();
  const doc = await Budget.findOneAndUpdate(
    { userId: reqUserObjectId(req), period, category },
    { $set: { limit } },
    { new: true, upsert: true, runValidators: true }
  );
  return res.json(doc);
});

router.delete('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid id' });
  }
  const result = await Budget.deleteOne({ _id: req.params.id, userId: reqUserObjectId(req) });
  if (result.deletedCount === 0) return res.status(404).json({ message: 'Not found' });
  return res.json({ ok: true });
});

export default router;
