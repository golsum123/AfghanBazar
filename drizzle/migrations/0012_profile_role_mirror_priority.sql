-- 0012: make profiles.role (display only) mirror the MOST PRIVILEGED row in user_roles.
-- Before, the sync trigger copied whichever role was inserted last, so granting 'admin' and then
-- inserting 'seller' (or the reverse) made the display role wrong. Authorization is unaffected:
-- it always reads public.user_roles through has_role(). No user_roles rows, policies or grants change.
-- Idempotent: safe to run more than once.
CREATE OR REPLACE FUNCTION public.sync_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := COALESCE(NEW.user_id, OLD.user_id);
  top public.app_role;
BEGIN
  SELECT role INTO top FROM public.user_roles WHERE user_id = uid
  ORDER BY CASE role WHEN 'admin' THEN 1 WHEN 'crm_staff' THEN 2 WHEN 'seller' THEN 3 ELSE 4 END
  LIMIT 1;
  IF top IS NOT NULL THEN
    UPDATE public.profiles SET role = top, updated_at = now() WHERE id = uid AND role IS DISTINCT FROM top;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS user_roles_sync_profile ON public.user_roles;
CREATE TRIGGER user_roles_sync_profile
AFTER INSERT ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_role();

-- One-time backfill of the display mirror for accounts that already have roles.
UPDATE public.profiles p SET role = t.top
FROM (
  SELECT DISTINCT ON (user_id) user_id, role AS top
  FROM public.user_roles
  ORDER BY user_id, CASE role WHEN 'admin' THEN 1 WHEN 'crm_staff' THEN 2 WHEN 'seller' THEN 3 ELSE 4 END
) t
WHERE p.id = t.user_id AND p.role IS DISTINCT FROM t.top;
