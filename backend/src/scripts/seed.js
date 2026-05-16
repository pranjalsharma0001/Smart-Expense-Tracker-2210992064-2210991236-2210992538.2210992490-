/**
 * Loads sample transactions for demo user. Run after MongoDB is up:
 *   npm run seed
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDb } from '../config/db.js';
import { User } from '../models/User.js';
import { Transaction } from '../models/Transaction.js';
import { Budget } from '../models/Budget.js';

const DEMO_EMAIL = 'demo@example.com';
const DEMO_PASSWORD = 'password123';

function periodKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI required');
  await connectDb(uri);

  let user = await User.findOne({ email: DEMO_EMAIL });
  if (!user) {
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
    user = await User.create({
      email: DEMO_EMAIL,
      passwordHash,
      name: 'Demo User',
    });
    console.log('Created demo user:', DEMO_EMAIL, '/', DEMO_PASSWORD);
  } else {
    console.log('Demo user already exists:', DEMO_EMAIL);
  }

  const uid = user._id;
  const existing = await Transaction.countDocuments({ userId: uid });
  if (existing > 0) {
    console.log('Transactions already seeded:', existing);
    await mongoose.disconnect();
    return;
  }

  const now = new Date();
  const samples = [];

  const addExpense = (daysAgo, amount, category, desc, pm = 'Card', source = 'manual') => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    samples.push({
      userId: uid,
      type: 'expense',
      amount,
      category,
      date: d,
      paymentMethod: pm,
      description: desc,
      autoCategorized: false,
      source,
    });
  };

  const addIncome = (daysAgo, amount, desc) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    samples.push({
      userId: uid,
      type: 'income',
      amount,
      category: 'Salary',
      date: d,
      paymentMethod: 'Transfer',
      description: desc,
      autoCategorized: false,
      source: 'manual',
    });
  };

  // Last ~60 days of activity
  addIncome(5, 3200, 'Monthly salary');
  addIncome(35, 3200, 'Monthly salary');

  addExpense(2, 42.5, 'Food', 'Grocery run at local market');
  addExpense(3, 18.9, 'Food', 'Coffee and pastry');
  addExpense(4, 120, 'Travel', 'Uber to airport');
  addExpense(6, 65, 'Bills', 'Internet subscription');
  addExpense(8, 45, 'Entertainment', 'Movie tickets');
  addExpense(10, 89, 'Shopping', 'Amazon electronics');
  addExpense(12, 200, 'Travel', 'Flight segment');
  addExpense(15, 35, 'Food', 'Restaurant dinner');
  addExpense(20, 55, 'Bills', 'Electric bill');
  addExpense(25, 22, 'Entertainment', 'Spotify');
  addExpense(28, 150, 'Shopping', 'Clothes mall');
  addExpense(40, 28, 'Food', 'Lunch cafe');
  addExpense(45, 300, 'Travel', 'Hotel booking');
  addExpense(50, 15, 'Food', 'Swiggy order');
  addExpense(55, 40, 'Bills', 'Water utility');

  await Transaction.insertMany(samples);

  const p = periodKey(now);
  await Budget.insertMany([
    { userId: uid, category: 'Food', limit: 400, period: p },
    { userId: uid, category: 'Travel', limit: 500, period: p },
    { userId: uid, category: 'Bills', limit: 250, period: p },
    { userId: uid, category: 'Entertainment', limit: 150, period: p },
    { userId: uid, category: 'Shopping', limit: 300, period: p },
  ]);

  console.log('Seeded', samples.length, 'transactions and budgets for', p);
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
