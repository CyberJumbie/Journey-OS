import type { Request, Response } from 'express';
import { z } from 'zod';
import { AuthService, AuthServiceError } from '../services/auth.service';

const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().min(1, 'Display name is required'),
});

const IndependentRegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
});

export class AuthController {
  private readonly authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * POST /api/v1/auth/login
   * Body: { email, password }
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const body = LoginSchema.parse(req.body);
      const result = await this.authService.login(body.email, body.password);
      res.json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: err.errors });
        return;
      }
      if (err instanceof AuthServiceError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      console.error('Login failed:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * POST /api/v1/auth/register
   * Body: { email, password, displayName }
   * Phase 1: always creates faculty role.
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const body = RegisterSchema.parse(req.body);
      const result = await this.authService.register(
        body.email,
        body.password,
        body.displayName,
      );

      // If token is empty, email confirmation is required
      if (!result.token) {
        res.status(201).json({
          message: 'Registration successful. Please check your email to confirm.',
          user: result.user,
        });
        return;
      }

      res.status(201).json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: err.errors });
        return;
      }
      if (err instanceof AuthServiceError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      console.error('Registration failed:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * POST /api/v1/auth/register/independent
   * Body: { email, password, name }
   * Creates an independent student (no institution).
   */
  async registerIndependent(req: Request, res: Response): Promise<void> {
    try {
      const body = IndependentRegisterSchema.parse(req.body);
      const result = await this.authService.registerIndependent(
        body.email,
        body.password,
        body.name,
      );
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: err.errors });
        return;
      }
      if (err instanceof AuthServiceError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      console.error('Independent registration failed:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /api/v1/auth/me
   * Requires authMiddleware — returns current user profile.
   */
  async me(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const result = await this.authService.getMe(req.user.userId, req.user.email);
      res.json(result);
    } catch (err) {
      if (err instanceof AuthServiceError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      console.error('Get me failed:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
