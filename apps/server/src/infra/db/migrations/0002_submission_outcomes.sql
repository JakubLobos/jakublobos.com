-- ADR-0017: lets a visitor see what happened to their note after the row is gone (I-4 deletes
-- rejected and superseded rows). Holds no text, no hash, no IP: only the client-generated random
-- token, the coarse outcome and when it happened. Pruned with the 24 h pending retention and
-- capped in size by the repository.
CREATE TABLE guestbook_submission_outcomes (
  client_request_id TEXT PRIMARY KEY,
  outcome           TEXT NOT NULL CHECK (outcome IN ('rejected','superseded')),
  reason            TEXT CHECK (reason IN ('inappropriate','off_topic','impersonation','personal_data')),
  created_at        TEXT NOT NULL,
  CHECK ((outcome = 'rejected') = (reason IS NOT NULL))
) STRICT;

CREATE INDEX ix_submission_outcomes_created ON guestbook_submission_outcomes (created_at);
