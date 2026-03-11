import SupabaseClientSingleton from '../lib/SupabaseClient';
import { AppError } from '../lib/errors';
import type { InviteUserPayload, UserRole } from '@journey-os/shared-types';
import {
  ADDITIONAL_ROLE_COMBINATIONS,
  DEFAULT_MAIN_ADMIN_PERMISSIONS,
  DEFAULT_NON_MAIN_ADMIN_PERMISSIONS,
} from '@journey-os/shared-types';
import type { AuthUser } from '../middleware/auth.middleware';
import { AdminService } from './admin.service';
import { AdminRepository } from '../repositories/admin.repository';
import { UserProfileRepository } from '../repositories/user-profile.repository';

/**
 * Permission matrix: what roles can the inviter send?
 */
function getAllowedRoles(inviter: AuthUser): UserRole[] {
  if (inviter.role === 'superadmin' && inviter.isMainAdmin) {
    return ['superadmin', 'institutional_admin', 'faculty', 'student', 'advisor'];
  }
  if (inviter.role === 'superadmin') {
    // Non-main superadmins: checked separately via can_manage_super_admins
    return [];
  }
  if (inviter.role === 'institutional_admin') {
    return ['institutional_admin', 'faculty', 'student', 'advisor'];
  }
  return [];
}

export class InvitationService {
  private readonly supabase = SupabaseClientSingleton.getInstance();
  private readonly adminService: AdminService;
  private readonly adminRepo: AdminRepository;
  private readonly userProfileRepo: UserProfileRepository;

  constructor(adminRepo?: AdminRepository, userProfileRepo?: UserProfileRepository) {
    this.adminRepo = adminRepo ?? new AdminRepository();
    this.userProfileRepo = userProfileRepo ?? new UserProfileRepository();
    this.adminService = new AdminService(this.adminRepo);
  }

  async sendInvite(
    payload: InviteUserPayload,
    inviter: AuthUser,
  ): Promise<{ userId: string; email: string }> {
    const allowedRoles = getAllowedRoles(inviter);

    // Special case: non-main superadmin with can_manage_super_admins can invite superadmins
    if (
      inviter.role === 'superadmin' &&
      !inviter.isMainAdmin &&
      payload.primary_role === 'superadmin'
    ) {
      const canManage = await this.adminService.hasPermission(
        inviter.userId,
        'can_manage_super_admins',
      );
      if (!canManage) {
        throw new AppError('FORBIDDEN', 'You do not have permission to invite super admins.', 403);
      }
    } else if (!allowedRoles.includes(payload.primary_role)) {
      throw new AppError(
        'FORBIDDEN',
        `You cannot invite users with role '${payload.primary_role}'.`,
        403,
      );
    }

    // Institution scoping: IAs can only invite within their institution
    if (inviter.role === 'institutional_admin' && inviter.institutionId) {
      if (payload.institution_id && payload.institution_id !== inviter.institutionId) {
        throw new AppError('FORBIDDEN', 'You can only invite users to your own institution.', 403);
      }
      payload.institution_id = inviter.institutionId;
    }

    // Validate additional role combinations
    const allowedAdditional = ADDITIONAL_ROLE_COMBINATIONS[payload.primary_role] ?? [];
    const invalidAdditional = (payload.additional_roles ?? []).filter(
      r => !allowedAdditional.includes(r),
    );
    if (invalidAdditional.length > 0) {
      throw new AppError(
        'INVALID_ROLES',
        `Invalid additional roles for ${payload.primary_role}: ${invalidAdditional.join(', ')}`,
        400,
      );
    }

    // Fire Supabase invite (sends magic link email)
    const { data, error } = await this.supabase.auth.admin.inviteUserByEmail(
      payload.email,
      {
        data: {
          role: payload.primary_role,
          additional_roles: payload.additional_roles ?? [],
          institution_id: payload.institution_id ?? null,
          is_main_admin: payload.is_main_admin ?? false,
          user_type: 'institutional',
          invited_by: inviter.userId,
        },
      },
    );

    if (error) {
      if (error.message.includes('already been registered')) {
        throw new AppError('ALREADY_REGISTERED', 'This email already has an account.', 409);
      }
      throw new AppError('INVITE_FAILED', error.message, 500);
    }

    const userId = data.user.id;

    // Create user_profile stub (completed in onboarding)
    await this.userProfileRepo.upsert({
      id: userId,
      email: payload.email,
      display_name: '',
      role: payload.primary_role,
      additional_roles: payload.additional_roles ?? [],
      is_main_admin: payload.is_main_admin ?? false,
      institution_id: payload.institution_id ?? null,
      user_type: 'institutional',
      is_course_director: false,
      onboarding_completed: false,
      onboarding_step: 0,
      onboarding_data: {},
    });

    // Create admin_permissions row if inviting a superadmin
    if (payload.primary_role === 'superadmin') {
      const permissions = payload.is_main_admin
        ? DEFAULT_MAIN_ADMIN_PERMISSIONS
        : (payload.permissions ?? DEFAULT_NON_MAIN_ADMIN_PERMISSIONS);

      await this.adminRepo.upsertPermissions(userId, permissions, inviter.userId);
    }

    return { userId, email: payload.email };
  }
}
