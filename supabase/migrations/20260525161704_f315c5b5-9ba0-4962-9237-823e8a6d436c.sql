
-- Restrict modifications to user_roles to admins only
CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Restrict has_role execution to authenticated users only
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- Restrict listing in the public tutorial-videos bucket: keep individual file reads public,
-- but only admins can list/enumerate files
DROP POLICY IF EXISTS "Public can list tutorial videos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view tutorial videos" ON storage.objects;
DROP POLICY IF EXISTS "Public read tutorial videos" ON storage.objects;

CREATE POLICY "Public can read individual tutorial video files"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'tutorial-videos' AND name IS NOT NULL AND name <> '');
