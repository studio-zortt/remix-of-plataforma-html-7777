INSERT INTO public.user_roles (user_id, role)
VALUES ('462e3047-1df4-41ca-ad06-2c6ac78717cc', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;