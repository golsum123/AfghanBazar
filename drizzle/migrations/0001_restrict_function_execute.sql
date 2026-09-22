REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_profile_role() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_profile_role() FROM anon, authenticated;