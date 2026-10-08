CREATE TABLE IF NOT EXISTS app_users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL,
 email text NOT NULL UNIQUE CHECK (email = lower(email)), password_hash text NOT NULL,
 role text NOT NULL CHECK (role IN ('admin','player')), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS app_sessions (
 token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS app_rate_limits (key text PRIMARY KEY, attempts integer NOT NULL, reset_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS app_tournaments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL,
 start_date date NOT NULL, deadline date NOT NULL CHECK (deadline >= start_date),
 interval_days integer NOT NULL CHECK (interval_days BETWEEN 1 AND 365),
 games_to_win integer NOT NULL CHECK (games_to_win BETWEEN 1 AND 5),
 state text NOT NULL DEFAULT 'draft' CHECK (state IN ('draft','published')),
 created_by uuid NOT NULL REFERENCES app_users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS app_invites (
 token_hash text PRIMARY KEY, tournament_id uuid NOT NULL UNIQUE REFERENCES app_tournaments(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL, revoked boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS app_groups (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tournament_id uuid NOT NULL REFERENCES app_tournaments(id) ON DELETE CASCADE,
 name text NOT NULL, capacity integer NOT NULL CHECK (capacity BETWEEN 2 AND 100),
 UNIQUE (id,tournament_id), UNIQUE(tournament_id,name)
);
CREATE TABLE IF NOT EXISTS app_entries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tournament_id uuid NOT NULL REFERENCES app_tournaments(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES app_users(id), group_id uuid, is_member boolean NOT NULL DEFAULT false,
 active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tournament_id,user_id), UNIQUE(id,tournament_id),
 FOREIGN KEY (group_id,tournament_id) REFERENCES app_groups(id,tournament_id)
);
CREATE TABLE IF NOT EXISTS app_games (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tournament_id uuid NOT NULL REFERENCES app_tournaments(id) ON DELETE CASCADE,
 group_id uuid NOT NULL, round_number integer NOT NULL CHECK(round_number > 0), proposed_date date NOT NULL,
 player_a uuid NOT NULL, player_b uuid NOT NULL CHECK(player_a <> player_b),
 score_a integer, score_b integer, reported_by uuid REFERENCES app_users(id), completed_at timestamptz,
 FOREIGN KEY (group_id,tournament_id) REFERENCES app_groups(id,tournament_id),
 FOREIGN KEY (player_a,tournament_id) REFERENCES app_entries(id,tournament_id),
 FOREIGN KEY (player_b,tournament_id) REFERENCES app_entries(id,tournament_id),
 UNIQUE(group_id,player_a,player_b),
 CHECK ((score_a IS NULL AND score_b IS NULL AND completed_at IS NULL) OR
        (score_a >= 0 AND score_b >= 0 AND completed_at IS NOT NULL))
);
CREATE TABLE IF NOT EXISTS app_notices (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES app_users(id),
 tournament_id uuid NOT NULL REFERENCES app_tournaments(id) ON DELETE CASCADE,
 message text NOT NULL, read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS app_mail (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES app_users(id),
 tournament_id uuid NOT NULL REFERENCES app_tournaments(id) ON DELETE CASCADE,
 subject text NOT NULL, body text NOT NULL, sent_at timestamptz, attempts integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS app_result_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), game_id uuid NOT NULL REFERENCES app_games(id) ON DELETE CASCADE,
 actor_id uuid NOT NULL REFERENCES app_users(id), old_score_a integer, old_score_b integer,
 score_a integer NOT NULL, score_b integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS app_entries_user_idx ON app_entries(user_id);
CREATE INDEX IF NOT EXISTS app_games_tournament_idx ON app_games(tournament_id);
CREATE INDEX IF NOT EXISTS app_notices_user_idx ON app_notices(user_id);
