-- Signed-in users must not debit, refund, or mint credits themselves.
-- Edge functions debit with consume_image_credits_for_profile.
-- Stripe grants packs with grant_purchased_credits as service_role.

REVOKE ALL ON FUNCTION public.consume_image_credits(INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_image_credits(INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_purchased_credits(UUID, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.consume_image_credits(INTEGER, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_image_credits(INTEGER, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.grant_purchased_credits(UUID, INTEGER, TEXT) TO service_role;
