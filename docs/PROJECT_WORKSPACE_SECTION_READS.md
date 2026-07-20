# Project workspace section reads

T2 migrates the compact workspace to five on-demand server reads: Client, Documents, Commercial, History and Engagement. The initial `/workspace` request still returns only the validated compact brief.

`ProjectWorkspaceLegacyAdapter` remains the desktop compatibility boundary. When the compact workspace slot is available, it delegates rendering to it; the legacy controller still owns the existing mutation dialogs and T3 actions (payment, PDF, SMS, portal, quote and appointment mutations, document upload/deletion).

Each section keeps its own state (`not_loaded`, `loading`, `ready`, `empty`, `error`, `unavailable`) and its own refresh button. Every endpoint resolves the authenticated session, project ownership and tenant/assignment authorization through `authorizeProjectAccess`; related table queries are additionally tenant- or artisan-scoped.
