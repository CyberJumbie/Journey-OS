import SupabaseClientSingleton from '../lib/SupabaseClient';
import { UserProfileRepository } from '../repositories/user-profile.repository';
import type { UserRole } from '@journey-os/shared-types';

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
    institutionId: string | null;
    isCourseDirector: boolean;
    displayName: string | null;
  };
}

export interface MeResponse {
  id: string;
  email: string;
  role: UserRole;
  institutionId: string | null;
  isCourseDirector: boolean;
  displayName: string | null;
}

export class AuthServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'AuthServiceError';
  }
}

/**
 * Auth service — business logic for authentication.
 * Delegates to Supabase Auth SDK for auth ops, UserProfileRepository for profile data.
 */
export class AuthService {
  private readonly supabase = SupabaseClientSingleton.getInstance();
  private readonly profileRepo = new UserProfileRepository();

  async login(email: string, password: string): Promise<AuthResponse> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new AuthServiceError(error.message, 401);
    }

    if (!data.session || !data.user) {
      throw new AuthServiceError('Login failed', 401);
    }

    const profile = await this.profileRepo.findById(data.user.id);
    if (!profile) {
      throw new AuthServiceError('User profile not found', 404);
    }

    return {
      token: data.session.access_token,
      user: {
        id: data.user.id,
        email: data.user.email ?? '',
        role: profile.role,
        institutionId: profile.institution_id,
        isCourseDirector: profile.is_course_director,
        displayName: profile.display_name,
      },
    };
  }

  async register(
    email: string,
    password: string,
    displayName: string,
  ): Promise<AuthResponse> {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          role: 'faculty',
        },
      },
    });

    if (error) {
      throw new AuthServiceError(error.message, 400);
    }

    if (!data.user) {
      throw new AuthServiceError('Registration failed', 400);
    }

    // Duplicate email detection: Supabase returns user with empty identities
    if (data.user.identities && data.user.identities.length === 0) {
      throw new AuthServiceError('An account with this email already exists', 409);
    }

    // Create user profile via repository
    await this.profileRepo.upsert({
      id: data.user.id,
      email,
      display_name: displayName,
      role: 'faculty',
      is_course_director: false,
      onboarding_completed: false,
      onboarding_step: 0,
    });

    if (data.session) {
      return {
        token: data.session.access_token,
        user: {
          id: data.user.id,
          email: data.user.email ?? '',
          role: 'faculty',
          institutionId: null,
          isCourseDirector: false,
          displayName,
        },
      };
    }

    // Email confirmation required — return placeholder
    return {
      token: '',
      user: {
        id: data.user.id,
        email: data.user.email ?? '',
        role: 'faculty',
        institutionId: null,
        isCourseDirector: false,
        displayName,
      },
    };
  }

  async registerIndependent(
    email: string,
    password: string,
    name: string,
  ): Promise<{ message: string; redirect: string }> {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: name,
          role: 'student',
          user_type: 'independent',
        },
      },
    });

    if (error) {
      throw new AuthServiceError(error.message, 400);
    }

    if (!data.user) {
      throw new AuthServiceError('Registration failed', 400);
    }

    if (data.user.identities && data.user.identities.length === 0) {
      throw new AuthServiceError('An account with this email already exists', 409);
    }

    await this.profileRepo.upsert({
      id: data.user.id,
      email,
      display_name: name,
      role: 'student',
      is_course_director: false,
      is_main_admin: false,
      additional_roles: [],
      user_type: 'independent',
      institution_id: null,
      onboarding_completed: false,
      onboarding_step: 0,
      onboarding_data: {},
    });

    return {
      message: 'Registration successful. Please check your email to confirm.',
      redirect: '/email-verification',
    };
  }

  async getMe(userId: string, email: string): Promise<MeResponse> {
    const profile = await this.profileRepo.findById(userId);
    if (!profile) {
      throw new AuthServiceError('User profile not found', 404);
    }

    return {
      id: userId,
      email,
      role: profile.role,
      institutionId: profile.institution_id,
      isCourseDirector: profile.is_course_director,
      displayName: profile.display_name,
    };
  }
}
