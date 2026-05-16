import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import { buildInsights } from '../utils/insights.js';

const router = Router();
router.use(authRequired);

router.get('/', async (req, res) => {
  const data = await buildInsights(req.userId);
  return res.json(data);
});

export default router;
