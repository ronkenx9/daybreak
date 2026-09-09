CREATE TABLE muse_creations (
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 ticker text NOT NULL,
 capsule_id text NOT NULL,
 fingerprint text NOT NULL,
 status text NOT NULL DEFAULT 'pending',
 image text,
 receipt text UNIQUE,
 error text,
 public boolean NOT NULL DEFAULT false,
 eligible boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz
);
--> statement-breakpoint
CREATE INDEX muse_creations_user_idx ON muse_creations(user_id,created_at DESC);
--> statement-breakpoint
ALTER TABLE muse_creations ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON muse_creations FROM anon,authenticated;
