export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}

export class InvalidInputError extends DomainError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidInputError";
  }
}

export class UserAlreadyExistsError extends DomainError {
  constructor(public readonly email: string) {
    super(`User already exists: ${email}`);
    this.name = "UserAlreadyExistsError";
  }
}

export class UserNotFoundError extends DomainError {
  constructor(public readonly identifier: string) {
    super(`User not found: ${identifier}`);
    this.name = "UserNotFoundError";
  }
}

export class EventAlreadyExistsError extends DomainError {
  constructor(public readonly slug: string) {
    super(`Event already exists: ${slug}`);
    this.name = "EventAlreadyExistsError";
  }
}

export class EventNotFoundError extends DomainError {
  constructor(public readonly slug: string) {
    super(`Event not found: ${slug}`);
    this.name = "EventNotFoundError";
  }
}

export class EventCapacityReachedError extends DomainError {
  constructor(public readonly slug: string) {
    super(`Event capacity reached: ${slug}`);
    this.name = "EventCapacityReachedError";
  }
}

export class RegistrationNotFoundError extends DomainError {
  constructor(public readonly eventSlug: string, public readonly userIdentifier: string) {
    super(`Registration not found for event=${eventSlug} user=${userIdentifier}`);
    this.name = "RegistrationNotFoundError";
  }
}

export class CancelledRegistrationCheckinError extends DomainError {
  constructor() {
    super("Cannot check in a cancelled registration.");
    this.name = "CancelledRegistrationCheckinError";
  }
}
