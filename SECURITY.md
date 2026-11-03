# Security boundaries

Files are selected deliberately and parsed in the browser; there is no upload endpoint. Keep personal GPX data on the device. The [production static header template](public/_headers) restricts network connections to the app origin and disables camera, microphone and location permissions. Browser storage is not encrypted and follows the browser profile's own security. Use it for data appropriate to that profile.

Preserve import size and route-count limits, coordinate/elevation validation, and rejection of XML DTD/entity declarations. Dependency lifecycle scripts are blocked except `workerd`, allowed in [`pnpm-workspace.yaml`](pnpm-workspace.yaml). No secrets belong in source.

Report security issues to the repository owner privately. Do not attach personal route files or credentials to public issues. This project has no security support SLA.
