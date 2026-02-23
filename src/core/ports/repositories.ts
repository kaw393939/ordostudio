export interface User {
  id: string;
  email: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  slug: string;
  title: string;
  start_at: string;
  end_at: string;
  timezone: string;
  delivery_mode?: "ONLINE" | "IN_PERSON" | "HYBRID";
  engagement_type?: "INDIVIDUAL" | "GROUP";
  location_text?: string | null;
  meeting_url?: string | null;
  instructor_state?: "TBA" | "PROPOSED" | "ASSIGNED" | "CONFIRMED" | "REASSIGNED";
  instructor_id?: string | null;
  instructor_name?: string | null;
  status: "DRAFT" | "PUBLISHED" | "CANCELLED";
  capacity: number | null;
  description?: string | null;
  metadata_json?: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Registration {
  id: string;
  event_id: string;
  user_id: string;
  status: "REGISTERED" | "WAITLISTED" | "CANCELLED" | "CHECKED_IN";
}

export interface UserRepository {
  findByEmail(email: string): User | undefined;
  findByIdentifier(identifier: string): User | undefined;
  create(user: User): void;
}

export interface EventRepository {
  findBySlug(slug: string): Event | undefined;
  create(event: Event): void;
  update(event: Event): void;
  countActiveRegistrations(eventId: string): number;
}

export interface RegistrationRepository {
  findByEventAndUser(eventId: string, userId: string): Registration | undefined;
  create(registration: Registration): void;
  updateStatus(id: string, status: Registration["status"]): void;
}

export interface AuditSink {
  record(args: {
    action: string;
    requestId: string;
    targetType: "system" | "event" | "registration";
    metadata?: Record<string, unknown>;
  }): void;
}
