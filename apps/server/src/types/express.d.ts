/**
 * Express Request augmentation: adds optional `user` property
 * populated by auth middleware after JWT verification.
 * [ARCHITECTURE v10 SS 4.2]
 */
declare namespace Express {
  interface Request {
    user?: import("@journey-os/types").AuthTokenPayload;
  }
}
