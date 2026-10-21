-- 0013 (one-off): give ONE existing account the admin role.
-- Account: Golsum Qurbani <golsumqurbani@gmail.com>, profile id 90c1c7f4-026a-4a70-9147-9939dee64a04.
-- The app's authorization source of truth is public.user_roles (public.has_role(), the RequireRole guard and
-- the /admin routes all read it); public.profiles.role is only a display mirror kept in sync by a trigger.
-- So this adds the 'admin' row to user_roles for that one user. The existing 'customer' row is kept, and no
-- other user, product, image or order is touched. Re-running changes nothing.
-- It aborts (and changes nothing) unless the profile id AND the email both match exactly.
-- Run as the database owner (SQL editor / migration), not through the app.

BEGIN;

DO $$
DECLARE
  uid constant uuid := '90c1c7f4-026a-4a70-9147-9939dee64a04';
  mail constant text := 'golsumqurbani@gmail.com';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = uid AND lower(email) = mail) THEN
    RAISE EXCEPTION 'No profile with id % and email % found; refusing to continue', uid, mail;
  END IF;

  -- The profiles guard trigger keeps profiles.role unchanged unless auth.uid() is an admin. Outside the app
  -- auth.uid() is null, so act as this very user for this transaction only (set_config is_local = true).
  -- This gives no extra access: the admin row is inserted first, in the same transaction, by the owner role.
  PERFORM set_config('request.jwt.claim.sub', uid::text, true);

  INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'admin') ON CONFLICT (user_id, role) DO NOTHING;

  -- Display mirror (the user_roles insert trigger normally does this; this covers a re-run).
  UPDATE public.profiles SET role = 'admin', updated_at = now() WHERE id = uid AND role IS DISTINCT FROM 'admin';
END $$;

-- Result: expect user_roles to list admin (and customer) and profiles.role = admin for this one account.
SELECT p.id, p.email, p.role AS profile_role,
  (SELECT string_agg(r.role::text, ', ' ORDER BY r.role::text) FROM public.user_roles r WHERE r.user_id = p.id) AS user_roles,
  public.has_role(p.id, 'admin') AS is_admin
FROM public.profiles p WHERE p.id = '90c1c7f4-026a-4a70-9147-9939dee64a04';

COMMIT;
