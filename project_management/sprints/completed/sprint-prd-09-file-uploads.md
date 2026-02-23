# Sprint PRD-09 — File Upload Infrastructure

## Severity: HIGH

## Goal
Build a file upload system with a `FileStorage` port, a local-disk adapter (dev), and an S3-compatible adapter (prod). Wire file uploads into the entities that need them: event banner images, apprentice profile avatars, field report attachments, and engagement artifacts.

## Why This Is High Priority
There is **zero file upload infrastructure**. No S3, no multer, no FormData handling, no presigned URLs. The avatar component only renders initial fallbacks. Events have no images. Field reports can't include evidence photos. Engagement artifacts are markdown-only. For an LMS, visual content is essential.

## Current State (Evidence)

| What exists | Where | Problem |
|-------------|-------|---------|
| No upload routes | No `FormData` or `multipart` handling anywhere | Can't accept files |
| No file storage | No S3, local disk, or blob storage | Nowhere to put files |
| No file columns in DB | No `image_url`, `avatar_url`, `attachment_url` in any table | No file references |
| Avatar component | `src/components/ui/avatar.tsx` — has `AvatarImage` + `AvatarFallback` | Only fallback used |
| Artifact content | `event_artifacts.content_md TEXT` | Markdown only, no files |
| Field reports | `field_reports` table — title, body, tags | No attachment support |
| Events | `events` table — title, slug, capacity, dates | No image support |
| Apprentice profiles | `apprentice_profiles` — tagline, bio, skills | No avatar support |

## Scope

### 1. FileStorage Port (`core/ports/file-storage.ts`)
```ts
export type UploadResult = {
  key: string;          // Storage key (e.g., "uploads/events/spring-launch/banner.jpg")
  url: string;          // Public URL to access the file
  contentType: string;
  sizeBytes: number;
};

export type FileMetadata = {
  key: string;
  url: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
};

export interface FileStoragePort {
  upload(key: string, data: Buffer | ReadableStream, contentType: string): Promise<UploadResult>;
  getUrl(key: string): string;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}
```

### 2. LocalFileStorage Adapter (`adapters/local/local-file-storage.ts`)
- Stores files in `data/uploads/` directory
- Serves via a Next.js API route: `GET /api/v1/files/:key`
- Simple and zero-dependency for local dev

### 3. S3FileStorage Adapter (`adapters/s3/s3-file-storage.ts`)
- Uses `@aws-sdk/client-s3` for S3-compatible storage
- Supports presigned upload URLs for large files
- Reads `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT` (for MinIO/R2 compatibility)
- `getUrl()` returns CDN URL or S3 public URL

### 4. FakeFileStorage (`core/ports/__tests__/fake-file-storage.ts`)
- In-memory Map for testing
- Records all operations

### 5. Upload Validation Helper (`lib/api/upload-validation.ts`)
```ts
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_DOCUMENT_TYPES = ["application/pdf", "text/plain", "text/markdown"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;  // 5 MB
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10 MB

export function validateUpload(file: File, category: "image" | "document"): ValidationResult;
```

### 6. DB Migrations
```sql
-- Add image_url to events
ALTER TABLE events ADD COLUMN image_url TEXT;

-- Add avatar_url to apprentice_profiles
ALTER TABLE apprentice_profiles ADD COLUMN avatar_url TEXT;

-- Create file_attachments table for field reports and artifacts
CREATE TABLE file_attachments (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,      -- 'field_report', 'artifact'
  entity_id TEXT NOT NULL,
  file_key TEXT NOT NULL,
  file_url TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  original_name TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  uploaded_at TEXT NOT NULL,
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);
CREATE INDEX idx_file_attachments_entity ON file_attachments(entity_type, entity_id);
```

### 7. Upload API Routes

**Event Banner:**
- `POST /api/v1/events/:slug/image` — upload event banner image
- `DELETE /api/v1/events/:slug/image` — remove event banner
- Admin only

**Apprentice Avatar:**
- `POST /api/v1/account/apprentice-profile/avatar` — upload profile photo
- `DELETE /api/v1/account/apprentice-profile/avatar` — remove photo
- Account owner only

**Field Report Attachments:**
- `POST /api/v1/account/field-reports/attachments` — upload attachment
- `DELETE /api/v1/account/field-reports/attachments/:id` — remove
- Report owner only

**Artifact Attachments:**
- `POST /api/v1/events/:slug/artifacts/attachments` — upload artifact file
- Admin or assigned instructor only

**File Serving (local dev):**
- `GET /api/v1/files/[...key]` — serves files from local storage (not needed in S3 mode)

### 8. Image Processing
- Validate dimensions (max 4096x4096)
- Generate thumbnail key for avatars (stored alongside original)
- Use `sharp` for resize if available, fall back to accepting as-is

## Non-Goals
- Video upload / streaming
- Bulk upload / drag-and-drop UI
- Image CDN / transformation service (Cloudinary, imgix)
- Virus scanning
- Client-side image cropping

## TDD Process

### Red Phase
1. **FileStoragePort contract tests** (`core/ports/__tests__/file-storage.contract.test.ts`):
   - Upload file → returns key and URL
   - `getUrl(key)` returns valid URL
   - `exists(key)` → true after upload
   - `delete(key)` → `exists(key)` → false
   - Upload with same key overwrites

2. **LocalFileStorage adapter tests**:
   - File written to disk at expected path
   - File retrievable via URL
   - Delete removes file from disk

3. **FakeFileStorage tests**:
   - Records uploads, get URLs, deletions

4. **Upload validation tests** (`lib/api/__tests__/upload-validation.test.ts`):
   - Valid JPEG → passes
   - Invalid content type → rejected
   - Oversized file → rejected
   - Empty file → rejected

5. **Upload route tests**:
   - POST event image with valid JPEG → 201 with URL
   - POST event image with invalid type → 422
   - POST event image as non-admin → 403
   - DELETE event image → 204, image_url set to null
   - POST avatar → 201, avatar_url updated
   - GET file (local) → 200 with correct content-type

### Green Phase — Implement all components
### Refactor Phase — Extract common upload handler logic

## E2E Verification Tests

### Test: "admin uploads event banner image"
```
1. Login as admin
2. Create and publish event
3. POST /api/v1/events/:slug/image with multipart form containing JPEG
4. Assert: 201 with { url: "..." }
5. GET /api/v1/events/:slug
6. Assert: event.image_url is non-null and matches upload URL
7. GET the image URL → 200 with image/jpeg content-type
```

### Test: "apprentice uploads profile avatar"
```
1. Login as user with apprentice profile
2. POST /api/v1/account/apprentice-profile/avatar with PNG
3. Assert: 201
4. GET /api/v1/account/apprentice-profile
5. Assert: profile.avatar_url is set
```

### Test: "file upload validates content type and size"
```
1. POST event image with text/plain file → 422 "unsupported content type"
2. POST event image with 10MB JPEG → 422 "file too large"
3. POST event image with empty body → 422
```

### Test: "field report with attachments"
```
1. Create field report
2. Upload 2 attachments
3. GET report → includes attachment list with URLs
4. Delete 1 attachment
5. GET report → 1 attachment remaining
```

## Acceptance Criteria
- [ ] `FileStoragePort` interface in `core/ports/`
- [ ] `LocalFileStorage` adapter for dev
- [ ] `S3FileStorage` adapter for prod
- [ ] `FakeFileStorage` test double
- [ ] Upload validation (type, size)
- [ ] DB migration: image_url on events, avatar_url on profiles, file_attachments table
- [ ] Event banner upload/delete routes
- [ ] Apprentice avatar upload/delete routes
- [ ] Field report attachment routes
- [ ] Artifact attachment routes
- [ ] Local file serving route
- [ ] All e2e verification tests pass
- [ ] `npm test`, `npm run lint`, `npm run build` all pass

## New Env Vars
| Variable | Default | Purpose |
|----------|---------|---------|
| `FILE_STORAGE_PROVIDER` | `"local"` | `"local"` or `"s3"` |
| `FILE_STORAGE_LOCAL_DIR` | `"./data/uploads"` | Local storage path |
| `S3_BUCKET` | none | S3 bucket name |
| `S3_REGION` | `"us-east-1"` | AWS region |
| `S3_ENDPOINT` | none | Custom endpoint (MinIO/R2) |
| `S3_ACCESS_KEY_ID` | none | AWS access key |
| `S3_SECRET_ACCESS_KEY` | none | AWS secret key |
| `FILE_PUBLIC_URL_BASE` | `"/api/v1/files"` | Base URL for file serving |

## End-of-Sprint Verification
```bash
npm test
npm run lint
npm run build
```
