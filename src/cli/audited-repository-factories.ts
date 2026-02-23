import { AuditedEventRepository } from "../core/infrastructure/decorators/audited-event-repository";
import { AuditedRegistrationRepository } from "../core/infrastructure/decorators/audited-registration-repository";
import { AuditedUserRepository } from "../core/infrastructure/decorators/audited-user-repository";
import { SqliteAuditSink } from "@/adapters/sqlite/audit-sink";
import {
  SqliteEventRepository,
  SqliteRegistrationRepository,
  SqliteUserRepository,
} from "@/adapters/sqlite/repositories";
import { AppConfig } from "./types";

export const createAuditedUserRepository = (
  config: AppConfig,
  context: ConstructorParameters<typeof AuditedUserRepository>[2],
): AuditedUserRepository =>
  new AuditedUserRepository(new SqliteUserRepository(config), new SqliteAuditSink(config), context);

export const createAuditedEventRepository = (
  config: AppConfig,
  context: ConstructorParameters<typeof AuditedEventRepository>[2],
): AuditedEventRepository =>
  new AuditedEventRepository(new SqliteEventRepository(config), new SqliteAuditSink(config), context);

export const createAuditedRegistrationRepository = (
  config: AppConfig,
  context: ConstructorParameters<typeof AuditedRegistrationRepository>[2],
): AuditedRegistrationRepository =>
  new AuditedRegistrationRepository(new SqliteRegistrationRepository(config), new SqliteAuditSink(config), context);

export const createRegistrationUseCaseDeps = (
  config: AppConfig,
  context: ConstructorParameters<typeof AuditedRegistrationRepository>[2],
): {
  users: SqliteUserRepository;
  events: SqliteEventRepository;
  registrations: AuditedRegistrationRepository;
} => ({
  users: new SqliteUserRepository(config),
  events: new SqliteEventRepository(config),
  registrations: createAuditedRegistrationRepository(config, context),
});
