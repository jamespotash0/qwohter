-- Drop can_view_cost
--
-- It was written as the gate on buy-side numbers, in anticipation of a role
-- vocabulary (PM, warehouse, installer, AP) and a field app that would give
-- installers logins. Neither is being built: this is an office system, and the
-- install app was cut.
--
-- Nothing ever called it. No RLS policy, no other function, no application
-- code. What made it worth removing rather than leaving dormant is its own
-- COMMENT -- "single source of truth for buy-side visibility" -- which read as
-- an assurance that cost was protected when nothing enforced it. A security
-- boundary that exists only in documentation is worse than none, because it
-- stops anyone looking for the real one.
--
-- If a client portal lands later it will need a different mechanism anyway: a
-- customer is not an organization member, so a membership check cannot serve
-- them. The right shape there is a view exposing sell-side fields only.

DROP FUNCTION IF EXISTS public.can_view_cost(uuid, uuid);
