-- Add profile_theme column to profiles
ALTER TABLE profiles
  ADD COLUMN profile_theme TEXT NOT NULL DEFAULT 'midnight-indigo';

ALTER TABLE profiles
  ADD CONSTRAINT profiles_profile_theme_check
  CHECK (profile_theme IN ('midnight-indigo', 'ocean-teal', 'emerald-pro', 'electric-blue', 'warm-neutral'));

-- Create avatars storage bucket (public read access)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to update their own avatar
CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to delete their own avatar
CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow public read access to avatars
CREATE POLICY "Public read access for avatars"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');
