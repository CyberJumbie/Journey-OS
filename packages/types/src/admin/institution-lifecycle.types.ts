/** Request body for suspending an institution */
export interface InstitutionSuspendRequest {
  readonly reason: string;
}

/** Request body for reactivating an institution (reason optional) */
export interface InstitutionReactivateRequest {
  readonly reason?: string;
}

/** Result returned after a status change */
export interface InstitutionStatusChangeResult {
  readonly institution_id: string;
  readonly institution_name: string;
  readonly from_status: string;
  readonly to_status: string;
  readonly reason: string | null;
  readonly changed_by: string;
  readonly changed_at: string;
  readonly affected_users: number;
}

/** Audit record stored in institution_status_changes table */
export interface InstitutionStatusChange {
  readonly id: string;
  readonly institution_id: string;
  readonly from_status: string;
  readonly to_status: string;
  readonly reason: string | null;
  readonly actor_id: string;
  readonly created_at: string;
}
