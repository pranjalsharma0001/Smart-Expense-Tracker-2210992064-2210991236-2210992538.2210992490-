import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { Transaction, EXPENSE_CATEGORIES } from '../models/Transaction.js';
import { authRequired } from '../middleware/auth.js';
import { suggestCategoryFromText, isValidExpenseCategory } from '../utils/categorization.js';
import { reqUserObjectId } from '../utils/userId.js';

const router = Router();

/** Inclusive UTC day bounds for YYYY-MM-DD (matches browser date-only saves). */
function dayRangeUtc(isoDate, endOfDay) {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return null;
  return endOfDay
    ? new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999))
    : new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}
router.use(authRequired);

const createValidators = [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be at least 0.01'),
  body('type').isIn(['expense', 'income']),
  body('date').isISO8601(),
  body('paymentMethod').optional().trim().isLength({ max: 80 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('category').optional().trim(),
  body('applyAutoCategory').optional().isBoolean(),
];

router.post('/', createValidators, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
  }
  let {
    amount,
    type,
    category,
    date,
    paymentMethod,
    description,
    applyAutoCategory,
  } = req.body;

  if (type === 'expense') {
    let auto = false;
    if (applyAutoCategory !== false && (!category || category === '')) {
      const suggested = suggestCategoryFromText(description || '');
      if (suggested) {
        category = suggested;
        auto = true;
      }
    }
    if (category && !isValidExpenseCategory(category)) {
      return res.status(400).json({
        message: 'Invalid category for expense',
        allowed: EXPENSE_CATEGORIES,
      });
    }
    const doc = await Transaction.create({
      userId: reqUserObjectId(req),
      amount,
      type,
      category: category || '',
      date,
      paymentMethod: paymentMethod || 'Cash',
      description: description || '',
      autoCategorized: auto,
      source: 'manual',
    });
    return res.status(201).json(doc);
  }

  const incomeDoc = await Transaction.create({
    userId: reqUserObjectId(req),
    amount,
    type: 'income',
    category: category?.trim() || 'Income',
    date,
    paymentMethod: paymentMethod || 'Transfer',
    description: description || '',
    autoCategorized: false,
    source: 'manual',
  });
  return res.status(201).json(incomeDoc);
});

const listValidators = [
  query('from').optional().isISO8601(),
  query('to').optional().isISO8601(),
  query('category').optional().trim(),
  query('type').optional().isIn(['expense', 'income']),
  query('minAmount').optional().isFloat({ min: 0 }),
  query('maxAmount').optional().isFloat({ min: 0 }),
  query('q').optional().trim(),
];

router.get('/', listValidators, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Invalid query', errors: errors.array() });
  }
  const uid = reqUserObjectId(req);
  const filter = { userId: uid };
  if (req.query.from || req.query.to) {
    filter.date = {};
    if (req.query.from) {
      const start = dayRangeUtc(String(req.query.from).slice(0, 10), false);
      if (start) filter.date.$gte = start;
    }
    if (req.query.to) {
      const end = dayRangeUtc(String(req.query.to).slice(0, 10), true);
      if (end) filter.date.$lte = end;
    }
  }
  if (req.query.category) filter.category = req.query.category;
  if (req.query.type) filter.type = req.query.type;
  if (req.query.minAmount != null || req.query.maxAmount != null) {
    filter.amount = {};
    if (req.query.minAmount != null) filter.amount.$gte = Number(req.query.minAmount);
    if (req.query.maxAmount != null) filter.amount.$lte = Number(req.query.maxAmount);
  }
  if (req.query.q) {
    const q = req.query.q;
    filter.$or = [
      { description: new RegExp(escapeRegex(q), 'i') },
      { category: new RegExp(escapeRegex(q), 'i') },
      { paymentMethod: new RegExp(escapeRegex(q), 'i') },
    ];
  }

  const items = await Transaction.find(filter).sort({ date: -1 }).limit(500).lean();
  return res.json(items);
});

router.get('/export.csv', async (req, res) => {
  const items = await Transaction.find({ userId: reqUserObjectId(req) }).sort({ date: -1 }).lean();
  const header = 'amount,type,category,date,paymentMethod,description,autoCategorized,source\n';
  const rows = items.map((t) =>
    [
      t.amount,
      t.type,
      csvEscape(t.category),
      new Date(t.date).toISOString(),
      csvEscape(t.paymentMethod),
      csvEscape(t.description),
      t.autoCategorized,
      t.source,
    ].join(',')
  );
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="expenses.csv"');
  return res.send(header + rows.join('\n'));
});

router.delete('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid id' });
  }
  const result = await Transaction.deleteOne({ _id: req.params.id, userId: reqUserObjectId(req) });
  if (result.deletedCount === 0) return res.status(404).json({ message: 'Not found' });
  return res.json({ ok: true });
});

router.patch('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: 'Invalid id' });
  }
  const allowed = ['amount', 'category', 'date', 'paymentMethod', 'description', 'type'];
  const update = {};
  for (const k of allowed) {
    if (req.body[k] !== undefined) update[k] = req.body[k];
  }
  if (update.type === 'expense' && update.category && !isValidExpenseCategory(update.category)) {
    return res.status(400).json({ message: 'Invalid category', allowed: EXPENSE_CATEGORIES });
  }
  const doc = await Transaction.findOneAndUpdate(
    { _id: req.params.id, userId: reqUserObjectId(req) },
    { $set: update },
    { new: true, runValidators: true }
  );
  if (!doc) return res.status(404).json({ message: 'Not found' });
  return res.json(doc);
});

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function csvEscape(s) {
  if (s == null) return '';
  const str = String(s);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export default router;
