# Architecture Decisions

- Seller and admin areas share `WorkspaceShell` for responsive navigation and workspace framing, while each dashboard owns its role-specific content and data.
- Delivery settings use one `delivery_zones` row per Ghana region; checkout and payment handlers share the region lookup to keep admin edits consistent across payment methods.
- Mobile checkout uses presentation-only delivery/payment steps in the existing checkout route; shared address, coupon, OTP, and order handlers remain authoritative so phone and desktop follow the same rules.
- Cart and checkout render persisted shopping state behind ClientOnly to prevent server/client total mismatches on direct visits.