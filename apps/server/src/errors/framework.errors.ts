import { DomainError } from "./base.errors";

export class InvalidFrameworkNodeError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidFrameworkNodeError";
  }
}
