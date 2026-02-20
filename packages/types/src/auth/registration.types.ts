/**
 * Registration wizard types.
 * [STORY-U-8] Multi-step registration: Role -> Profile -> Institution -> FERPA Consent.
 */

/** Steps in the registration wizard */
export type RegistrationStep = "role" | "profile" | "institution" | "consent";

/** Self-registerable roles (superadmin and institutional_admin are invite-only) */
export type SelfRegisterableRole = "faculty" | "student" | "advisor";

/** Step 1: Role selection */
export interface RoleSelectionData {
  readonly role: SelfRegisterableRole;
}

/** Step 2: Profile info */
export interface ProfileData {
  readonly email: string;
  readonly password: string;
  readonly display_name: string;
}

/** Step 3: Institution association */
export interface InstitutionData {
  readonly institution_id: string;
}

/** Step 4: FERPA consent */
export interface FerpaConsentData {
  readonly consented: boolean;
  readonly consent_version: string;
}

/** Combined registration submission DTO (all 4 steps) */
export interface RegistrationRequest {
  readonly role: SelfRegisterableRole;
  readonly email: string;
  readonly password: string;
  readonly display_name: string;
  readonly institution_id: string;
  readonly consented: boolean;
  readonly consent_version: string;
}

/** Registration response */
export interface RegistrationResponse {
  readonly user_id: string;
  readonly email: string;
  readonly requires_verification: boolean;
}
