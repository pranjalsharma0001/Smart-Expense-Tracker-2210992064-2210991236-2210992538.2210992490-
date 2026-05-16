import mongoose from 'mongoose';
import { EXPENSE_CATEGORIES } from './Transaction.js';

const budgetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      enum: EXPENSE_CATEGORIES,
    },
    /** Monthly limit in user's currency */
    limit: { type: Number, required: true, min: 0 },
    /** Year-month key e.g. 2025-03 for monthly budget periods */
    period: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

budgetSchema.index({ userId: 1, period: 1, category: 1 }, { unique: true });

export const Budget = mongoose.model('Budget', budgetSchema);
