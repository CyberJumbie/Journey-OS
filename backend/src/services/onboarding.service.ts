import { UserProfileRepository } from '../repositories/user-profile.repository';
import type { OnboardingUpdate, UserRole } from '@journey-os/shared-types';

export class OnboardingService {
  private readonly userProfileRepo: UserProfileRepository;

  constructor(userProfileRepo?: UserProfileRepository) {
    this.userProfileRepo = userProfileRepo ?? new UserProfileRepository();
  }

  async getOnboardingState(userId: string): Promise<{
    onboarding_step: number;
    onboarding_completed: boolean;
    onboarding_data: Record<string, unknown>;
    role: UserRole;
  }> {
    const profile = await this.userProfileRepo.findById(userId);
    if (!profile) throw new Error('User profile not found');
    return {
      onboarding_step: profile.onboarding_step,
      onboarding_completed: profile.onboarding_completed,
      onboarding_data: profile.onboarding_data,
      role: profile.role,
    };
  }

  async updateOnboarding(userId: string, update: OnboardingUpdate): Promise<{ step: number; completed: boolean }> {
    const current = await this.getOnboardingState(userId);

    // Merge step data into onboarding_data JSONB
    const mergedData = {
      ...(current.onboarding_data ?? {}),
      [`step_${update.step}`]: update.data,
    };

    await this.userProfileRepo.updateFields(userId, {
      onboarding_step: update.step,
      onboarding_data: mergedData,
      ...(update.completed
        ? {
            onboarding_completed: true,
            // Note: don't activate here — activation happens elsewhere for security
          }
        : {}),
    });

    return { step: update.step, completed: update.completed ?? false };
  }

  async updateProfile(
    userId: string,
    fields: {
      display_name?: string;
      is_course_director?: boolean;
    },
  ): Promise<void> {
    await this.userProfileRepo.updateFields(userId, fields);
  }
}
