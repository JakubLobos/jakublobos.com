CREATE TABLE guestbook_messages (
  id                INTEGER PRIMARY KEY AUTOINCREMENT, -- never reuse ids: a stale approve(id) must not hit a newer row (I-1)
  public_id         TEXT    NOT NULL UNIQUE,
  client_request_id TEXT    NOT NULL UNIQUE,
  body              TEXT    NOT NULL CHECK (length(body) BETWEEN 1 AND 120),
  paint             TEXT    NOT NULL CHECK (paint IN ('red','coral','yellow','purple','violet','blue')),
  locale            TEXT    CHECK (locale IN ('en','pl')),      -- page locale at submission (archive context)
  content_hash      TEXT    NOT NULL UNIQUE,
  status            TEXT    NOT NULL CHECK (status IN ('pending','approved')),
  attempts          INTEGER NOT NULL DEFAULT 0,
  next_attempt_at   TEXT,
  last_error_code   TEXT,
  created_at        TEXT    NOT NULL,
  approved_at       TEXT,
  CHECK ((status = 'approved') = (approved_at IS NOT NULL))
) STRICT;

CREATE INDEX ix_guestbook_approved ON guestbook_messages (status, approved_at DESC, id DESC);
CREATE UNIQUE INDEX ux_guestbook_single_pending ON guestbook_messages (status) WHERE status = 'pending';  -- I-7

CREATE TRIGGER trg_guestbook_retention_cap
BEFORE INSERT ON guestbook_messages
WHEN (SELECT COUNT(*) FROM guestbook_messages) >= 100
BEGIN
  SELECT RAISE(ABORT, 'guestbook_retention_cap');
END;
