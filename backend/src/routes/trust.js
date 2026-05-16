import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';
import { evaluateDataTrust } from '../utils/trust.js';

const router = Router();
router.use(authRequired);

/** Erosion-of-trust / data quality indicator */
router.get('/status', async (req, res) => {
  const data = await evaluateDataTrust(req.userId);
  return res.json(data);
});

export default router;
