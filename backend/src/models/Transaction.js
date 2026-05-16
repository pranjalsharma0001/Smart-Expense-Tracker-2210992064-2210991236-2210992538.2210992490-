import mongoose from 'mongoose';

export const EXPENSE_CATEGORIES = [
  'Food',
  'Travel',
  'Bills',
  'Entertainment',
  'Shopping',
];

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0.01, 'Amount must be positive'],
    },
    type: {
      type: String,
      enum: ['expense', 'income'],
      required: true,
    },
    category: {
      type: String,
      trim: true,
      default: '',
    },
    date: { type: Date, required: true, index: true },
    paymentMethod: {
      type: String,
      trim: true,
      default: 'Cash',
    },
    description: { type: String, trim: true, default: '' },
    /** True when category was inferred from description keywords */
    autoCategorized: { type: Boolean, default: false },
    /** Source for mock automation: manual | bank | sms */
    source: {
      type: String,
      enum: ['manual', 'bank', 'sms'],
      default: 'manual',
    },
  },
  { timestamps: true }
);

transactionSchema.index({ userId: 1, date: -1 });

export const Transaction = mongoose.model('Transaction', transactionSchema);
