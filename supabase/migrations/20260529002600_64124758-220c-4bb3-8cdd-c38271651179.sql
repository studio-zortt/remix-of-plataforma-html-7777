
-- Trigger-only functions: revoke from public/anon/authenticated
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- has_role is used in RLS policies; authenticated needs it
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Restrict bucket listing: only allow direct file reads via signed/public URLs, not listing.
DROP POLICY IF EXISTS "Public can read tutorial videos" ON storage.objects;

CREATE POLICY "Public can read tutorial video files"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'tutorial-videos' AND (storage.foldername(name)) IS NOT NULL);
