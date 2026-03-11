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
  isMainAdmin: boolean;
  additionalRoles: UserRole[];
  userType: string;
}

// Augment Express Request to include user
declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

/**
 * Express middleware that validates a Supabase JWT from the Authorization header.
 * Reads role + institution from JWT app_metadata (populated by sync_jwt_claims trigger).
 * Falls back to user_profiles query if claims are not yet in the JWT.
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

  const token = authHeader.slice(7);

  try {
    const supabase = SupabaseClientSingleton.getInstance();

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    const meta = user.app_metadata as Record<string, unknown> | undefined;

    // Primary path: read from JWT claims (no DB query)
    if (meta?.role) {
      req.user = {
        userId: user.id,
        email: user.email ?? '',
        role: meta.role as UserRole,
        institutionId: (meta.institution_id as string) ?? null,
        isCourseDirector: (meta.is_course_director as boolean) ?? false,
        isMainAdmin: (meta.is_main_admin as boolean) ?? false,
        additionalRoles: (meta.additional_roles as UserRole[]) ?? [],
        userType: (meta.user_type as string) ?? 'institutional',
      };
      next();
      return;
    }

    // Fallback: query DB (for users created before JWT trigger)
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, role, institution_id, is_course_director, is_main_admin, additional_roles, user_type')
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
      isMainAdmin: (profile.is_main_admin as boolean) ?? false,
      additionalRoles: (profile.additional_roles as UserRole[]) ?? [],
      userType: (profile.user_type as string) ?? 'institutional',
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

/**
 * Guards Course Director-only endpoints.
 * Must be used AFTER authMiddleware.
 */
export function requireCourseDirector(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user || req.user.role !== 'faculty' || !req.user.isCourseDirector) {
    res.status(403).json({ error: 'Course Director access required' });
    return;
  }
  next();
}

/**
 * Prevents cross-institution data access.
 * Reads institution_id from JWT — never from request body/params.
 * Superadmin bypasses this check entirely.
 *
 * @param getResourceInstitutionId - async function that extracts the institution_id
 *   of the resource being accessed from the request.
 */
export function requireInstitutionScope(
  getResourceInstitutionId: (req: Request) => Promise<string | null>,
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // Superadmin bypasses institution scoping — sees everything
    if (req.user.role === 'superadmin') {
      next();
      return;
    }

    const resourceInstitutionId = await getResourceInstitutionId(req);
    if (!resourceInstitutionId) {
      res.status(404).json({ error: 'Resource not found' });
      return;
    }

    if (resourceInstitutionId !== req.user.institutionId) {
      res.status(403).json({ error: 'Cross-institution access denied' });
      return;
    }

    next();
  };
}
