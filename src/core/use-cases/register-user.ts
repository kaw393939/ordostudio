import { InvalidInputError, UserAlreadyExistsError } from "../domain/errors";
import { User, UserRepository } from "../ports/repositories";

export const registerUser = (
  input: { email: string; status: string },
  deps: {
    users: UserRepository;
    now: () => string;
    id: () => string;
  },
): User => {
  const normalizedEmail = input.email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new InvalidInputError("Email is required.");
  }

  if (deps.users.findByEmail(normalizedEmail)) {
    throw new UserAlreadyExistsError(normalizedEmail);
  }

  const now = deps.now();
  const user: User = {
    id: deps.id(),
    email: normalizedEmail,
    status: input.status,
    created_at: now,
    updated_at: now,
  };

  deps.users.create(user);
  return user;
};
