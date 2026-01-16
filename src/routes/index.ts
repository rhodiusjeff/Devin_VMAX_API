import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './users';
import fleetRoutes from './fleets';
import regulatorRoutes from './regulators';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/fleets', fleetRoutes);
router.use('/regulators', regulatorRoutes);

export default router;
