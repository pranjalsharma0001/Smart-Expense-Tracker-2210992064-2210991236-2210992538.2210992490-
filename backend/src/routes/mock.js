import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { Transaction } from '../models/Transaction.js';
import { authRequired } from '../middleware/auth.js';
import { suggestCategoryFromText, isValidExpenseCategory } from '../utils/categorization.js';
import { reqUserObjectId } from '../utils/userId.js';

const router = Router();
router.use(authRequired);

/**
 * Simulated bank/SMS webhook: ingests raw lines and creates expense rows.
 * Example body: { "lines": [ { "amount": 12.5, "text": "Uber trip", "date": "2025-03-20" } ], "source": "bank" }
 */
router.post('/ingest', [
  body('lines').isArray({ min: 1 }),
  body('lines.*.amount').isFloat({ min: 0.01 }),
  body('lines.*.text').isString().trim().notEmpty(),
  body('lines.*.date').optional().isISO8601(),
  body('source').optional().isIn(['bank', 'sms']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
  }
  const source = req.body.source || 'bank';
  const created = [];
  for (const line of req.body.lines) {
    const date = line.date ? new Date(line.date) : new Date();
    const suggested = suggestCategoryFromText(line.text);
    const category = suggested && isValidExpenseCategory(suggested) ? suggested : '';
    const doc = await Transaction.create({
      userId: reqUserObjectId(req),
      amount: line.amount,
      type: 'expense',
      category,
      date,
      paymentMethod: source === 'bank' ? 'Card' : 'Other',
      description: `[${source.toUpperCase()}] ${line.text}`,
      autoCategorized: Boolean(suggested),
      source,
    });
    created.push(doc);
  }
  return res.status(201).json({ count: created.length, items: created });
});

export default router;
