# Architecture Decisions

- Seller and admin areas share `WorkspaceShell` for responsive navigation and workspace framing, while each dashboard owns its role-specific content and data.
- Delivery settings use one `delivery_zones` row per Ghana region; checkout and payment handlers share the region lookup to keep admin edits consistent across payment methods.