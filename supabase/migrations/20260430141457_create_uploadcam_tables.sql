/*
  # UploadCam — Initial Schema

  ## Tables
  
  ### user_settings
  Stores per-user Google Drive OAuth tokens and preferences.
  - `id` (uuid, PK) — matches auth.uid()
  - `google_access_token` (text) — Google OAuth access token
  - `google_refresh_token` (text) — Google OAuth refresh token
  - `google_token_expiry` (timestamptz) — when the access token expires
  - `google_email` (text) — connected Google account email
  - `google_drive_folder_id` (text) — cached root "UploadCam" folder ID in Drive
  - `created_at`, `updated_at` (timestamptz)

  ### upload_history
  Permanent record of every successfully uploaded photo.
  - `id` (uuid, PK)
  - `user_id` (uuid, FK → auth.uid())
  - `filename` (text) — original filename on device
  - `drive_file_id` (text) — Google Drive file ID
  - `drive_path` (text) — human-readable path, e.g. /UploadCam/2026/04/30/
  - `file_size` (integer) — bytes
  - `uploaded_at` (timestamptz)
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on both tables
  - Users can only access their own rows
*/

-- ─── user_settings ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_settings (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  google_access_token   text,
  google_refresh_token  text,
  google_token_expiry   timestamptz,
  google_email          text,
  google_drive_folder_id text,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own settings"
  ON user_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own settings"
  ON user_settings FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- ─── upload_history ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS upload_history (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL,
  filename      text NOT NULL DEFAULT '',
  drive_file_id text NOT NULL DEFAULT '',
  drive_path    text NOT NULL DEFAULT '',
  file_size     integer NOT NULL DEFAULT 0,
  uploaded_at   timestamptz DEFAULT now(),
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE upload_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own upload history"
  ON upload_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own upload history"
  ON upload_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own upload history"
  ON upload_history FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ─── updated_at trigger ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_user_settings_updated_at'
  ) THEN
    CREATE TRIGGER set_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;
