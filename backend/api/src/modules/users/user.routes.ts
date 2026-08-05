import { Router } from 'express';
import { UserController } from './user.controller.ts';
import { authenticate } from '../../middlewares/auth.middleware.ts';

const router = Router();
const userController = new UserController();

router.get('/profile', authenticate, userController.getProfile.bind(userController));

export default router;