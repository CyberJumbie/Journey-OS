import type { Request, Response, NextFunction } from 'express';
import SupabaseClientSingleton from '../lib/SupabaseClient';
import type { UserRole } from '@journey-os/shared-types';

/**
 * Authenticated user shape attached to req.user by authMiddleware.
 */
export interface AuthUser {
  userId: string;
  email: string;
  role: UserRole;
  institutionId: string | null;
  isCourseDirector: boolean;
}

// Augment Express Request to include user
declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

/**
 * Express middleware that validates a Supabase JWT from the Authorization header.
 * Extracts user profile from the `user_profiles` table and attaches to req.user.
 *
 * Usage:
 *   router.get('/protected', authMiddleware, controller.handler);
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  const token = authHeader.slice(7); // Remove 'Bearer '

  try {
    const supabase = SupabaseClientSingleton.getInstance();

    // Verify JWT and get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Fetch user profile for role + institution info
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, role, institution_id, is_course_director')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      res.status(403).json({ error: 'User profile not found' });
      return;
    }

    req.user = {
      userId: profile.id as string,
      email: user.email ?? '',
      role: profile.role as UserRole,
      institutionId: (profile.institution_id as string) ?? null,
      isCourseDirector: (profile.is_course_director as boolean) ?? false,
    };

    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Factory for role-based access control middleware.
 * Must be used AFTER authMiddleware.
 *
 * Usage:
 *   router.get('/admin-only', authMiddleware, requireRole(['superadmin']), controller.handler);
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}
