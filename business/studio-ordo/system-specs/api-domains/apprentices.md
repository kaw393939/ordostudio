# API Domain: Apprenticeship

**Owner:** Keith Williams · **Last updated:** 2026-02-22

Canonical sources:

- Public apprentice routes: `src/app/api/v1/apprentices/**/route.ts`
- Levels: `src/app/api/v1/apprentice-levels/route.ts`
- Progress logic: `src/lib/api/apprentice-progress.ts`
- Gate submissions: `src/lib/api/gate-submissions.ts`
- Vocabulary: `src/lib/api/vocabulary.ts`
- Account profile: `src/app/api/v1/account/apprentice-profile/**/route.ts`

---

## Public endpoints

### Directory

- `GET /api/v1/apprentices`
- `GET /api/v1/apprentices/{handle}`

### Levels

- `GET /api/v1/apprentice-levels`

### Progress

- `GET /api/v1/apprentices/{handle}/progress`

Notes:

- Progress is computed by resolving handle → user_id, then aggregating:
  - current level
  - gate submission status
  - vocabulary count
  - next gate suggestion

### Vocabulary

- `GET /api/v1/apprentices/{handle}/vocabulary`
- `POST /api/v1/apprentices/{handle}/vocabulary`
  - Schema: `addVocabularySchema`

### Gate submissions

- `POST /api/v1/apprentices/{handle}/gate-submissions`
  - Schema: `gateSubmissionSchema`
- `PATCH /api/v1/apprentices/{handle}/gate-submissions/{id}`
  - Schema: `reviewGateSubmissionSchema`

---

## Account endpoints

- `GET /api/v1/account/apprentice-profile`
- `PUT /api/v1/account/apprentice-profile` (schema: `apprenticeProfileSchema`)
- `POST /api/v1/account/apprentice-profile/avatar`
- `DELETE /api/v1/account/apprentice-profile/avatar`

---

## Admin endpoints

- `GET /api/v1/admin/apprentices`
- `PATCH /api/v1/admin/apprentices/{userId}` (approval + management)
