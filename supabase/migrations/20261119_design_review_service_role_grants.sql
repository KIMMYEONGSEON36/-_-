-- Explicitly grant the server API role the table privileges needed by
-- api/design-review.js. This does not grant access to anon or authenticated;
-- service_role is used only on the server after request authorization.
grant select, insert, update on public.requests, public.design_files, public.design_reviews to service_role;
