# Security boundaries

This is a private local-first prototype. Files are selected deliberately and parsed in the browser; there is no upload endpoint. The production static header template restricts network connections to the app origin and disables camera, microphone and location permissions. Browser storage is not encrypted and follows the browser profile's own security. Use it for data appropriate to that profile.

Input/file sizes and collection counts are bounded. Domain schemas reject invalid finite values and unsupported states. Lifecycle scripts are disabled during installation. Dependencies and CI actions are pinned. No secrets belong in source.

Report an issue privately through this private repository. Do not attach personal route files, videos or credentials to a public issue. This project has no public security support SLA.
