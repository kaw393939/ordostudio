// @vitest-environment node
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST as postEventImage, DELETE as deleteEventImage } from "../api/v1/events/[slug]/image/route";
import { POST as postAvatar, DELETE as deleteAvatar } from "../api/v1/account/apprentice-profile/avatar/route";
import { POST as postFieldReportAttachment } from "../api/v1/account/field-reports/attachments/route";
import { DELETE as deleteFieldReportAttachment } from "../api/v1/account/field-reports/attachments/[attachmentId]/route";
import { POST as postArtifactAttachment } from "../api/v1/events/[slug]/artifacts/attachments/route";
import { GET as getFile } from "../api/v1/files/[...key]/route";
import {
  cleanupStandardE2EFixtures,
  setupStandardE2EFixture,
  type StandardE2EFixture,
} from "./helpers/e2e-fixtures";
import { FakeFileStorage } from "../../core/ports/__tests__/fake-file-storage";
import { setFileStorage, resetFileStorage } from "../../platform/file-storage";

let fixture: StandardE2EFixture;
let fakeStorage: FakeFileStorage;

/** Build a multipart/form-data request with a File and optional extra fields. */
const buildUploadRequest = (
  url: string,
  cookie: string,
  fileContent: Buffer,
  fileName: string,
  fileType: string,
  extraFields?: Record<string, string>,
) => {
  const formData = new FormData();
  const blob = new Blob([fileContent], { type: fileType });
  formData.append("file", new File([blob], fileName, { type: fileType }));
  if (extraFields) {
    for (const [k, v] of Object.entries(extraFields)) {
      formData.append(k, v);
    }
  }
  return new Request(url, {
    method: "POST",
    headers: {
      origin: "http://localhost:3000",
      cookie,
    },
    body: formData,
  });
};

describe("e2e file upload infrastructure (PRD-09)", () => {
  beforeEach(async () => {
    fakeStorage = new FakeFileStorage();
    setFileStorage(fakeStorage);
    fixture = await setupStandardE2EFixture();
    process.env.APPCTL_ENV = "local";
  });

  afterEach(async () => {
    resetFileStorage();
    await cleanupStandardE2EFixtures();
  });

  // ──── Upload validation tests ────────────────────────────

  describe("upload validation", () => {
    it("rejects an unsupported image type for event banner", async () => {
      const req = buildUploadRequest(
        "http://localhost:3000/api/v1/events/published-open/image",
        fixture.adminCookie,
        Buffer.from("fake-bmp-data"),
        "photo.bmp",
        "image/bmp",
      );

      const resp = await postEventImage(req, { params: Promise.resolve({ slug: "published-open" }) });
      expect(resp.status).toBe(422);
      const body = await resp.json();
      expect(body.detail).toContain("Unsupported image type");
    });

    it("rejects an oversized image (> 5 MB)", async () => {
      const oversized = Buffer.alloc(6 * 1024 * 1024);
      const req = buildUploadRequest(
        "http://localhost:3000/api/v1/events/published-open/image",
        fixture.adminCookie,
        oversized,
        "huge.jpg",
        "image/jpeg",
      );

      const resp = await postEventImage(req, { params: Promise.resolve({ slug: "published-open" }) });
      expect(resp.status).toBe(422);
      const body = await resp.json();
      expect(body.detail).toContain("too large");
    });

    it("rejects a request with no file field", async () => {
      const formData = new FormData();
      const req = new Request("http://localhost:3000/api/v1/events/published-open/image", {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
        body: formData,
      });

      const resp = await postEventImage(req, { params: Promise.resolve({ slug: "published-open" }) });
      expect(resp.status).toBe(422);
    });
  });

  // ──── Event banner image ─────────────────────────────────

  describe("event banner image", () => {
    it("uploads a banner image for an event (admin)", async () => {
      const imageData = Buffer.from("fake-png-data");
      const req = buildUploadRequest(
        "http://localhost:3000/api/v1/events/published-open/image",
        fixture.adminCookie,
        imageData,
        "banner.png",
        "image/png",
      );

      const resp = await postEventImage(req, { params: Promise.resolve({ slug: "published-open" }) });
      expect(resp.status).toBe(201);

      const body = await resp.json();
      expect(body.url).toContain("/api/v1/files/");
      expect(body.content_type).toBe("image/png");
      expect(body.size_bytes).toBe(imageData.byteLength);

      // Verify file was stored
      expect(fakeStorage.files.size).toBe(1);
      const key = fakeStorage.operations[0].key;
      expect(key).toContain("events");

      // Verify DB was updated
      const db = new Database(fixture.dbPath);
      const event = db.prepare("SELECT image_url FROM events WHERE slug = ?").get("published-open") as { image_url: string };
      db.close();
      expect(event.image_url).toBeTruthy();
    });

    it("rejects non-admin users from uploading event banners", async () => {
      const req = buildUploadRequest(
        "http://localhost:3000/api/v1/events/published-open/image",
        fixture.userCookie,
        Buffer.from("img-data"),
        "banner.png",
        "image/png",
      );

      const resp = await postEventImage(req, { params: Promise.resolve({ slug: "published-open" }) });
      expect(resp.status).toBe(403);
    });

    it("returns 404 for non-existent event slug", async () => {
      const req = buildUploadRequest(
        "http://localhost:3000/api/v1/events/no-such-event/image",
        fixture.adminCookie,
        Buffer.from("img-data"),
        "banner.png",
        "image/png",
      );

      const resp = await postEventImage(req, { params: Promise.resolve({ slug: "no-such-event" }) });
      expect(resp.status).toBe(404);
    });

    it("deletes an event banner image", async () => {
      // First upload
      const req = buildUploadRequest(
        "http://localhost:3000/api/v1/events/published-open/image",
        fixture.adminCookie,
        Buffer.from("img-data"),
        "banner.png",
        "image/png",
      );
      await postEventImage(req, { params: Promise.resolve({ slug: "published-open" }) });
      expect(fakeStorage.files.size).toBe(1);

      // Then delete
      const delReq = new Request("http://localhost:3000/api/v1/events/published-open/image", {
        method: "DELETE",
        headers: {
          origin: "http://localhost:3000",
          cookie: fixture.adminCookie,
        },
      });
      const resp = await deleteEventImage(delReq, { params: Promise.resolve({ slug: "published-open" }) });
      expect(resp.status).toBe(204);

      // Verify storage deleted
      expect(fakeStorage.files.size).toBe(0);

      // Verify DB cleared
      const db = new Database(fixture.dbPath);
      const event = db.prepare("SELECT image_url FROM events WHERE slug = ?").get("published-open") as { image_url: string | null };
      db.close();
      expect(event.image_url).toBeNull();
    });
  });

  // ──── Avatar upload ──────────────────────────────────────

  describe("avatar upload", () => {
    const createProfile = (dbPath: string, userId: string) => {
      const db = new Database(dbPath);
      db.prepare(
        `INSERT INTO apprentice_profiles (user_id, handle, display_name, tags, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'APPROVED', datetime('now'), datetime('now'))`,
      ).run(userId, `handle-${userId.substring(0, 8)}`, "Test User", "tag1,tag2");
      db.close();
    };

    it("uploads an avatar for a user with an apprentice profile", async () => {
      createProfile(fixture.dbPath, fixture.userId);

      const req = buildUploadRequest(
        "http://localhost:3000/api/v1/account/apprentice-profile/avatar",
        fixture.userCookie,
        Buffer.from("avatar-data"),
        "avatar.jpg",
        "image/jpeg",
      );

      const resp = await postAvatar(req);
      expect(resp.status).toBe(201);

      const body = await resp.json();
      expect(body.url).toContain("/api/v1/files/");
      expect(body.content_type).toBe("image/jpeg");

      // Verify DB
      const db = new Database(fixture.dbPath);
      const profile = db.prepare("SELECT avatar_url FROM apprentice_profiles WHERE user_id = ?").get(fixture.userId) as { avatar_url: string };
      db.close();
      expect(profile.avatar_url).toBeTruthy();
    });

    it("returns 404 when user has no apprentice profile", async () => {
      const req = buildUploadRequest(
        "http://localhost:3000/api/v1/account/apprentice-profile/avatar",
        fixture.userCookie,
        Buffer.from("avatar-data"),
        "avatar.jpg",
        "image/jpeg",
      );

      const resp = await postAvatar(req);
      expect(resp.status).toBe(404);
    });

    it("returns 401 for unauthenticated avatar upload", async () => {
      const req = buildUploadRequest(
        "http://localhost:3000/api/v1/account/apprentice-profile/avatar",
        "",
        Buffer.from("avatar-data"),
        "avatar.jpg",
        "image/jpeg",
      );

      const resp = await postAvatar(req);
      expect(resp.status).toBe(401);
    });

    it("deletes an avatar", async () => {
      createProfile(fixture.dbPath, fixture.userId);

      // Upload
      const req = buildUploadRequest(
        "http://localhost:3000/api/v1/account/apprentice-profile/avatar",
        fixture.userCookie,
        Buffer.from("avatar-data"),
        "avatar.jpg",
        "image/jpeg",
      );
      await postAvatar(req);
      expect(fakeStorage.files.size).toBe(1);

      // Delete
      const delReq = new Request("http://localhost:3000/api/v1/account/apprentice-profile/avatar", {
        method: "DELETE",
        headers: {
          origin: "http://localhost:3000",
          cookie: fixture.userCookie,
        },
      });
      const resp = await deleteAvatar(delReq);
      expect(resp.status).toBe(204);

      expect(fakeStorage.files.size).toBe(0);

      const db = new Database(fixture.dbPath);
      const profile = db.prepare("SELECT avatar_url FROM apprentice_profiles WHERE user_id = ?").get(fixture.userId) as { avatar_url: string | null };
      db.close();
      expect(profile.avatar_url).toBeNull();
    });
  });

  // ──── Field report attachments ───────────────────────────

  describe("field report attachments", () => {
    const createFieldReport = (dbPath: string, userId: string, eventSlug: string): string => {
      const db = new Database(dbPath);
      const event = db.prepare("SELECT id FROM events WHERE slug = ?").get(eventSlug) as { id: string };
      const reportId = `report-${Date.now()}`;
      db.prepare(
        `INSERT INTO field_reports (id, event_id, user_id, key_insights, models, money, people, what_i_tried, client_advice, created_at, updated_at)
         VALUES (?, ?, ?, 'insight', 'model', 'money', 'people', 'tried', 'advice', datetime('now'), datetime('now'))`,
      ).run(reportId, event.id, userId);
      db.close();
      return reportId;
    };

    it("uploads an attachment to a field report", async () => {
      const reportId = createFieldReport(fixture.dbPath, fixture.userId, "published-open");

      const req = buildUploadRequest(
        "http://localhost:3000/api/v1/account/field-reports/attachments",
        fixture.userCookie,
        Buffer.from("pdf-content"),
        "notes.pdf",
        "application/pdf",
        { report_id: reportId },
      );

      const resp = await postFieldReportAttachment(req);
      expect(resp.status).toBe(201);

      const body = await resp.json();
      expect(body.id).toBeTruthy();
      expect(body.content_type).toBe("application/pdf");
      expect(body.original_name).toBe("notes.pdf");

      // Verify file_attachments table
      const db = new Database(fixture.dbPath);
      const attachment = db.prepare("SELECT * FROM file_attachments WHERE id = ?").get(body.id) as Record<string, unknown>;
      db.close();
      expect(attachment.entity_type).toBe("field_report");
      expect(attachment.entity_id).toBe(reportId);
    });

    it("rejects attachment when report_id is missing", async () => {
      const req = buildUploadRequest(
        "http://localhost:3000/api/v1/account/field-reports/attachments",
        fixture.userCookie,
        Buffer.from("pdf-content"),
        "notes.pdf",
        "application/pdf",
      );

      const resp = await postFieldReportAttachment(req);
      expect(resp.status).toBe(422);
      const body = await resp.json();
      expect(body.detail).toContain("report_id");
    });

    it("returns 404 when field report does not belong to user", async () => {
      // Create report owned by admin, try to upload as user
      const reportId = createFieldReport(fixture.dbPath, fixture.adminId, "published-open");

      const req = buildUploadRequest(
        "http://localhost:3000/api/v1/account/field-reports/attachments",
        fixture.userCookie,
        Buffer.from("pdf-content"),
        "notes.pdf",
        "application/pdf",
        { report_id: reportId },
      );

      const resp = await postFieldReportAttachment(req);
      expect(resp.status).toBe(404);
    });

    it("deletes a field report attachment", async () => {
      const reportId = createFieldReport(fixture.dbPath, fixture.userId, "published-open");

      // Upload
      const uploadReq = buildUploadRequest(
        "http://localhost:3000/api/v1/account/field-reports/attachments",
        fixture.userCookie,
        Buffer.from("to-delete"),
        "temp.pdf",
        "application/pdf",
        { report_id: reportId },
      );
      const uploadResp = await postFieldReportAttachment(uploadReq);
      const { id: attachmentId } = await uploadResp.json();

      // Delete
      const delReq = new Request(`http://localhost:3000/api/v1/account/field-reports/attachments/${attachmentId}`, {
        method: "DELETE",
        headers: {
          origin: "http://localhost:3000",
          cookie: fixture.userCookie,
        },
      });
      const resp = await deleteFieldReportAttachment(delReq, {
        params: Promise.resolve({ attachmentId }),
      });
      expect(resp.status).toBe(200);

      // Verify deleted from DB
      const db = new Database(fixture.dbPath);
      const count = db.prepare("SELECT count(*) as c FROM file_attachments WHERE id = ?").get(attachmentId) as { c: number };
      db.close();
      expect(count.c).toBe(0);

      // Verify file removed from storage
      expect(fakeStorage.operations.some((op) => op.op === "delete")).toBe(true);
    });

    it("returns 404 when deleting another user's attachment", async () => {
      const reportId = createFieldReport(fixture.dbPath, fixture.adminId, "published-open");

      // Upload as admin
      const uploadReq = buildUploadRequest(
        "http://localhost:3000/api/v1/account/field-reports/attachments",
        fixture.adminCookie,
        Buffer.from("admin-file"),
        "admin.pdf",
        "application/pdf",
        { report_id: reportId },
      );
      const uploadResp = await postFieldReportAttachment(uploadReq);
      const { id: attachmentId } = await uploadResp.json();

      // Try delete as regular user
      const delReq = new Request(`http://localhost:3000/api/v1/account/field-reports/attachments/${attachmentId}`, {
        method: "DELETE",
        headers: {
          origin: "http://localhost:3000",
          cookie: fixture.userCookie,
        },
      });
      const resp = await deleteFieldReportAttachment(delReq, {
        params: Promise.resolve({ attachmentId }),
      });
      expect(resp.status).toBe(404);
    });
  });

  // ──── Artifact attachments ───────────────────────────────

  describe("artifact attachments", () => {
    const createArtifact = (dbPath: string, eventSlug: string, createdBy: string): string => {
      const db = new Database(dbPath);
      const event = db.prepare("SELECT id FROM events WHERE slug = ?").get(eventSlug) as { id: string };
      const artifactId = `artifact-${Date.now()}`;
      db.prepare(
        `INSERT INTO event_artifacts (id, event_id, title, resource_url, scope, created_by, created_at, updated_at)
         VALUES (?, ?, 'Test Artifact', 'https://example.com/resource', 'EVENT', ?, datetime('now'), datetime('now'))`,
      ).run(artifactId, event.id, createdBy);
      db.close();
      return artifactId;
    };

    it("uploads an attachment to an artifact (admin)", async () => {
      const artifactId = createArtifact(fixture.dbPath, "published-open", fixture.adminId);

      const req = buildUploadRequest(
        "http://localhost:3000/api/v1/events/published-open/artifacts/attachments",
        fixture.adminCookie,
        Buffer.from("doc-content"),
        "slides.pdf",
        "application/pdf",
        { artifact_id: artifactId },
      );

      const resp = await postArtifactAttachment(req, { params: Promise.resolve({ slug: "published-open" }) });
      expect(resp.status).toBe(201);

      const body = await resp.json();
      expect(body.id).toBeTruthy();
      expect(body.content_type).toBe("application/pdf");
      expect(body.original_name).toBe("slides.pdf");

      // Verify file_attachments table
      const db = new Database(fixture.dbPath);
      const attachment = db.prepare("SELECT * FROM file_attachments WHERE id = ?").get(body.id) as Record<string, unknown>;
      db.close();
      expect(attachment.entity_type).toBe("artifact");
      expect(attachment.entity_id).toBe(artifactId);
    });

    it("rejects non-admin users from uploading artifact attachments", async () => {
      const artifactId = createArtifact(fixture.dbPath, "published-open", fixture.adminId);

      const req = buildUploadRequest(
        "http://localhost:3000/api/v1/events/published-open/artifacts/attachments",
        fixture.userCookie,
        Buffer.from("doc-content"),
        "slides.pdf",
        "application/pdf",
        { artifact_id: artifactId },
      );

      const resp = await postArtifactAttachment(req, { params: Promise.resolve({ slug: "published-open" }) });
      expect(resp.status).toBe(403);
    });

    it("returns 404 for non-existent event", async () => {
      const req = buildUploadRequest(
        "http://localhost:3000/api/v1/events/no-event/artifacts/attachments",
        fixture.adminCookie,
        Buffer.from("doc-content"),
        "slides.pdf",
        "application/pdf",
        { artifact_id: "whatever" },
      );

      const resp = await postArtifactAttachment(req, { params: Promise.resolve({ slug: "no-event" }) });
      expect(resp.status).toBe(404);
    });

    it("returns 404 for non-existent artifact", async () => {
      const req = buildUploadRequest(
        "http://localhost:3000/api/v1/events/published-open/artifacts/attachments",
        fixture.adminCookie,
        Buffer.from("doc-content"),
        "slides.pdf",
        "application/pdf",
        { artifact_id: "non-existent-artifact" },
      );

      const resp = await postArtifactAttachment(req, { params: Promise.resolve({ slug: "published-open" }) });
      expect(resp.status).toBe(404);
    });

    it("rejects when artifact_id is missing", async () => {
      const req = buildUploadRequest(
        "http://localhost:3000/api/v1/events/published-open/artifacts/attachments",
        fixture.adminCookie,
        Buffer.from("doc-content"),
        "slides.pdf",
        "application/pdf",
      );

      const resp = await postArtifactAttachment(req, { params: Promise.resolve({ slug: "published-open" }) });
      expect(resp.status).toBe(422);
    });
  });

  // ──── File serving route ─────────────────────────────────

  describe("file serving route", () => {
    it("returns 404 for non-existent file key", async () => {
      const req = new Request("http://localhost:3000/api/v1/files/uploads/events/no-file.png", {
        method: "GET",
      });

      const resp = await getFile(req, { params: Promise.resolve({ key: ["uploads", "events", "no-file.png"] }) });
      expect(resp.status).toBe(404);
    });

    it("returns 404 for empty key segments", async () => {
      const req = new Request("http://localhost:3000/api/v1/files", {
        method: "GET",
      });

      const resp = await getFile(req, { params: Promise.resolve({ key: [] }) });
      expect(resp.status).toBe(404);
    });

    it("rejects path traversal attempts", async () => {
      const req = new Request("http://localhost:3000/api/v1/files/../../../etc/passwd", {
        method: "GET",
      });

      const resp = await getFile(req, { params: Promise.resolve({ key: ["..", "..", "..", "etc", "passwd"] }) });
      expect(resp.status).toBe(404);
    });

    it("returns 404 when storage is not LocalFileStorage (S3 mode)", async () => {
      // FakeFileStorage is not LocalFileStorage, so this should 404
      const req = new Request("http://localhost:3000/api/v1/files/uploads/test.png", {
        method: "GET",
      });

      const resp = await getFile(req, { params: Promise.resolve({ key: ["uploads", "test.png"] }) });
      expect(resp.status).toBe(404);
    });
  });
});
