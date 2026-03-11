import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { OnboardingController } from '../controllers/onboarding.controller';

const router: Router = Router();
const controller = new OnboardingController();

// GET /api/v1/users/me/onboarding — get current onboarding state
router.get('/', authMiddleware, (req, res) => controller.getState(req, res));

// PATCH /api/v1/users/me/onboarding — update onboarding step
router.patch('/', authMiddleware, (req, res) => controller.updateStep(req, res));

// PATCH /api/v1/users/me/profile — update profile fields during onboarding
router.patch('/profile', authMiddleware, (req, res) => controller.updateProfile(req, res));

export default router;
