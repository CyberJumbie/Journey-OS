import { AdminRepository } from '../repositories/admin.repository';
import { AppError } from '../lib/errors';
import type { AdminPermissions } from '@journey-os/shared-types';
import { DEFAULT_MAIN_ADMIN_PERMISSIONS } from '@journey-os/shared-types';

export class AdminService {
  constructor(private readonly repo: AdminRepository) {}

  async assertMainAdminCountSafe(excludeUserId: string): Promise<void> {
    const remaining = await this.repo.getActiveMainAdminCount(excludeUserId);
    if (remaining < 1) {
      throw new AppError(
        'LAST_MAIN_ADMIN',
        'Cannot perform this action — at least one active main admin must remain. Grant main admin status to another admin first.',
        403,
      );
    }
  }

  async grantMainAdminStatus(targetUserId: string, grantedBy: string): Promise<void> {
    const permissions = await this.repo.getPermissions(targetUserId);
    if (!permissions) {
      throw new AppError(
        'NOT_SUPER_ADMIN',
        'Cannot grant main admin status to a non-super-admin user.',
        400,
      );
    }

    await this.repo.setMainAdminStatus(targetUserId, true);
    await this.repo.upsertPermissions(targetUserId, DEFAULT_MAIN_ADMIN_PERMISSIONS, grantedBy);
  }

  async revokeMainAdminStatus(targetUserId: string, _revokedBy: string): Promise<void> {
    await this.assertMainAdminCountSafe(targetUserId);
    await this.repo.setMainAdminStatus(targetUserId, false);
  }

  async updatePermissions(
    targetUserId: string,
    permissions: Partial<Omit<AdminPermissions, 'user_id' | 'updated_at'>>,
    updatedBy: string,
  ): Promise<AdminPermissions> {
    return this.repo.upsertPermissions(targetUserId, permissions, updatedBy);
  }

  async hasPermission(
    userId: string,
    permission: keyof Omit<AdminPermissions, 'user_id' | 'granted_by' | 'updated_at'>,
  ): Promise<boolean> {
    const perms = await this.repo.getPermissions(userId);
    if (!perms) return false;
    return perms[permission] === true;
  }
}
