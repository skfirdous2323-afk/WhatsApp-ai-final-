-- ============================================================
-- 038_doctor_photos_storage.sql
-- Storage bucket for clinic doctor profile photos
-- ============================================================

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'doctor-photos',
  'doctor-photos',
  TRUE,
  2097152,
  ARRAY[
    'image/png',
    'image/jpeg',
    'image/webp'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Doctor photos are publicly readable" ON storage.objects;
CREATE POLICY "Doctor photos are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'doctor-photos');

DROP POLICY IF EXISTS "Users can upload doctor photos" ON storage.objects;
CREATE POLICY "Users can upload doctor photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'doctor-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update doctor photos" ON storage.objects;
CREATE POLICY "Users can update doctor photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'doctor-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete doctor photos" ON storage.objects;
CREATE POLICY "Users can delete doctor photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'doctor-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
