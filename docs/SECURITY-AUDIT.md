# Security audit and deployment notes

Audit date: 26 October 2026. Scope: repository source, locked dependencies, GitHub Actions, and the supplied Hostinger site. This is a source review with regression tests and deployment checks, not a claim that every possible vulnerability has been eliminated.

## Architecture and applicability

This application is **React/TypeScript with a standalone PHP/MySQL API**, not Laravel. There are no Laravel controllers, Eloquent models, FormRequests, Sanctum/JWT tokens, `routes/web.php`, `config/session.php`, or `APP_DEBUG` setting. Adding disconnected Laravel middleware would not protect this application. The equivalent controls are implemented in `server/security.php`, `server/database.php`, `public/api.php`, and `public/.htaccess`.

## Findings, exploit scenarios, fixes and tests

| Severity | Finding and realistic exploit | Implemented fix | Verification |
| --- | --- | --- | --- |
| Critical | Database password committed in two PHP files. Anyone with repository access/history could connect wherever the database permits access. | Remove literals; rotate the database password; load `omega-private/config.php` outside the document root. Configuration fails closed when absent or located within the document root. | Private provisioning verifies the new DB login. Artifact test rejects public config/SQL. Live checks deny `.env`, `.git` and SQL downloads. |
| Critical | `VITE_API_KEY` was embedded in downloadable JavaScript, granting all API actions to anyone who copied it. `me` returned the first administrator. | Remove shared browser key entirely. Password-hashed accounts, server-side PHP sessions, authenticated DB-backed identity and logout invalidation. | Anonymous inventory returns 401; obsolete API key cannot bypass login; session fixation and post-logout replay tests. |
| High | UI role switching and caller-supplied user IDs could impersonate administrators or crew. | DB-backed role checks on every protected request. Only admins create or change equipment status. Crew may check out for themselves and return their own assignments. Logged actor comes from the session. | Crew escalation, cross-user checkout/return and log attribution integration tests. |
| High | No CSRF, login throttling or authenticated-session lifetime controls. | CSRF on every POST including login/logout; exact same-origin checks; no CORS allowlist grants; host-only Secure/HttpOnly/SameSite=Lax cookies; strict session IDs; idle 30 minutes, absolute 8 hours; login regeneration; per-IP/per-account throttling. | Missing/wrong token tests; hostile Origin test; cookie flags; brute-force 429 and Retry-After; logout replay. |
| High | Unbounded or nested JSON values could trigger type errors and inconsistent writes; broad object spreading resembles mass assignment. | 16 KiB JSON-object limit, content-type/method enforcement, field allowlists, scalar types, byte lengths, ID formats, status enums and referenced-record checks. No input-derived SQL identifiers. | Malformed JSON, oversized body, wrong MIME, extra role field, nested inputs, invalid category and SQL-like identifiers. |
| High | Checkout check/update race allowed conflicting assignments; missing records could still appear successful. Writes and audit logs were independent; status changes could bypass returns. | InnoDB transactions, row locks, existing-record checks and explicit state transitions. Log and inventory mutation commit together. Duplicate values/conflicting states return 409. | Re-checkout conflicts, missing ID, maintenance checkout rejection, checked-out status-bypass rejection and actor logs. |
| High | AI provider key was compiled into client code and could be reused to consume quota. | Remove browser SDK and build-time secrets. Authenticated same-origin PHP proxy, fixed HTTPS provider, bounded prompt/response, timeout and per-account hourly limit. | Production bundle excludes provider credentials/endpoints; anonymous access denied. Provider execution requires a newly provisioned server-only key and is currently optional. |
| High | Plain FTP deployment could disclose credentials/code in transit; no required security tests before deploy. | Restricted dedicated SSH key, known-host pinning, path/type/size validation of deployment archive, serialization, PHP/config checks and private release backups. CI action versions pinned to commits; minimum contents permission. | CI runs all checks before deploying and verifies the public access controls afterward. |
| Medium | Public SQL installer exposed schema and demo records; old builds could remain downloadable; missing response headers and HTTPS enforcement. | Remove SQL from `public/`, deploy a fresh directory, deny dotpaths/server files/config/backups/SQL, disable indexes, canonical HTTPS redirect, CSP, HSTS, frame denial, nosniff, referrer and permissions policies. | Live HTTP redirect/header checks and blocked SQL, `.builds`, `.user.ini`, `_server`, `.git`, `.env` requests. |
| Medium | Failed live requests silently returned/mutated demo data, misleading operators about successful checkouts. | Production always uses the live API; failures propagate. Demo mode requires an explicit development-only setting. Workflow reports partial completion instead of declaring every bulk operation successful. | Production artifact checks plus manual failure-path review; API rejects failed operations without mutation. |
| Medium | Seven dependency advisories in the original lockfile. | Compatible dependency updates and removal of the now-unneeded client AI SDK. | `npm audit --audit-level=moderate`; zero advisories at verification time. |

## PHP and server controls

`public/.htaccess` applies LiteSpeed per-directory settings for hidden errors, logging, secure cookie defaults, body limits and restricted `open_basedir`. `public/.user.ini` supplies corresponding settings for compatible PHP/FPM installations, but the live Hostinger web SAPI did not honor that file during verification. Application error responses contain generic messages and a correlation reference; SQL, connection strings and traces are not returned. Logs omit raw exception messages because they may contain sensitive data.

The LiteSpeed `open_basedir` restriction was verified under the actual web SAPI (PHP 8.3.36), independently of CLI PHP 8.5.12. Change the domain-specific paths in both configurations when hosting elsewhere.

**Verified hosting limitation:** error display is off, URL includes are disabled and `open_basedir` is restricted. The system-level `expose_php` flag is still on, URL fopen/uploads are still enabled in PHP, and the complete recommended dangerous-function disable list is not active. These flags require hPanel/provider configuration on this plan. PHP's identifying response header is removed, multipart requests are rejected before PHP parses them, and the application has no upload/process-execution routes. These controls do not imply that the system-level flags were changed.

`server/php.ini.production.example` contains the exact recommended system-level directives, including `expose_php`, `disable_functions`, `allow_url_fopen` and a domain-specific `open_basedir` template. **System-level directives cannot be enforced by `.user.ini` or `ini_set`.** Apply them through hPanel's PHP configuration or the host's effective web-SAPI configuration. The application does not call process-execution functions. Do not disable those functions in the CLI runtime used by deployment without separately testing deployment. PHP CLI version does not establish the web-SAPI version or effective settings.

The enforcing CSP allows only same-origin scripts and API connections. Google Fonts and the existing image providers are explicitly allowed. `style-src 'unsafe-inline'` supports the existing React inline styles; no `unsafe-inline` or `unsafe-eval` is allowed for scripts. HSTS is limited to this hostname; `includeSubDomains` and preload are intentionally not assumed safe for unrelated subdomains. HTTPS detection does not trust arbitrary forwarded headers: configure TLS correctly at the server and verify that the PHP web SAPI sees HTTPS.

There is no runtime ORM mass assignment or user-interpolated query value. Static read SQL is harmless; all dynamic query values use prepared parameters. The sole dynamic table identifier is selected from a fixed internal allowlist. Provisioning uses a newly generated hexadecimal database password, never request input; MariaDB uses its own-account SET PASSWORD statement.

## Uploads and password reset

There are no upload or HTTP password-reset routes in this application. The web server rejects multipart uploads before PHP parses them, the JSON API rejects non-JSON content, and no public upload directory is deployed. No unused upload route has been added merely to demonstrate a framework feature. If uploads are added later, require server MIME detection, an explicit raster allowlist, size/dimension limits, randomized names, storage outside public_html, authorization on download, and rejection of executable/SVG/HTML content. Laravel's `Rules\File` would apply only after an actual Laravel migration.

Password provisioning/reset is CLI-only through `tools/manage-user.php`. Passwords are hashed with PHP's password API, must be 14–72 bytes, and are supplied on stdin instead of shell arguments. Reset increments `auth_version`, invalidating existing sessions. Public registration and self-service password recovery are not present. Do not add reset endpoints without generic responses, short-lived hashed one-time tokens, per-IP/per-account limits and an authenticated mail channel.

## Operations and residual actions

1. Keep `omega-private/`, its backups and the local `.local-deploy/` directory private. Neither is a public build artifact. Configuration file mode should be 600, private directory 700.
2. The old database credential was rotated. The old shared browser key is no longer accepted. Git history still contains obsolete secrets; rotation, rather than history rewriting, revokes their usefulness. Do not reuse them. History rewriting would need separate coordination with repository collaborators.
3. Remove unused `VITE_API_KEY` and FTP secrets after the SSH deployment is verified. An old Gemini key, if ever used in a browser build, must be revoked at the provider before enabling server-side AI.
4. Provision individual crew accounts using existing profile IDs. Do not share the bootstrap administrator account across a team. A separate identity provider/MFA and user-management UI are future work.
5. Apply/verify hPanel's effective PHP system settings and a supported web-SAPI PHP release. Header checks alone cannot prove `disable_functions` or `open_basedir` are active. This audit does not assume a WAF, provider rate limiting or hidden network restrictions.
6. The file limiter uses `REMOTE_ADDR`, not spoofable forwarding headers, and is suitable for this single server. A trusted proxy configuration and shared limiter/session backend are required before scaling across hosts. Shared-NAT users share an IP login limit. Clean old limiter files periodically through a private scheduled maintenance task if usage grows.
7. Inventory reads are capped at 2,000 rows and activity history at the latest 1,000 entries. Add paginated endpoints before exceeding those limits. All signed-in crew currently may read team inventory, profiles and activity; an organization/tenant isolation model is not present.
8. Private release/database backups need a retention policy and periodic restore drills. The pre-security release contains obsolete embedded credentials and is for recovery evidence, not a secure production rollback target.
9. AI is disabled until a fresh server-only Gemini key is configured. Network requests to the provider were not tested without such a key. Filming prompts leave the application when AI is enabled; do not include secrets or personal data in prompts.

## Reproducing the checks

```sh
npm ci
npm run typecheck
npm run test:security
npm run build
npm run test:artifact
npm audit --audit-level=moderate
```

For integration tests, start a disposable local MySQL/MariaDB server on **127.0.0.1:3308**, with an empty local root password. Do not point the fixture at production. The fixture requires `OMEGA_TEST_DATABASE=omega_security_test` and modifies only that explicitly named test database; its demo schema resets that database.

```sh
mkdir -p .local-deploy
OMEGA_TEST_DATABASE=omega_security_test php tests/setup-db.php
OMEGA_CONFIG_FILE="$PWD/.local-deploy/test-config.php" php -S 127.0.0.1:8080 -t public
# In another terminal:
npm run test:api
# Non-destructive public production checks:
node tests/live.mjs
```

GitHub Actions provisions its own disposable MariaDB instance and runs these tests automatically. Tests include malicious names to verify that text is bound as data, not interpreted as SQL.

## Public visitor access — 27 October 2026

At the owner's request, the sign-in page now advertises the reserved `user` credentials and offers an **Explore demo** button. These credentials are intentionally public, unlike administrator, database and provider credentials. `current_actor()` derives `read_only` from the account's database login on every request, including existing sessions and ordinary password sign-ins. The request body cannot grant write access. `authorize()` uses an explicit read/logout allowlist for this identity, denying checkout, return, equipment edits and paid AI requests before mutation. Individual crew accounts retain their previous operational permissions. The UI labels visitor mode and disables inventory mutations.

Tests cover public-user write rejection, continued individual-crew operations, logout, API state transitions and the published visitor sign-in. Demo credentials must be updated in `services/demo.ts` if the reserved account's password is rotated. The public view intentionally exposes the same team inventory and activity reads previously available to this user; it is not a separate tenant or a synthetic dataset.

## Primary guidance

- [PHP: securing session INI settings](https://www.php.net/manual/en/session.security.ini.php)
- [PHP: session management](https://www.php.net/manual/en/features.session.security.management.php)
- [OWASP: REST security](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html)
- [PHP: password hashing](https://www.php.net/manual/en/function.password-hash.php)
- [PHP: INI changeability modes](https://www.php.net/manual/en/configuration.changes.modes.php)

Verified results: 25 PHP security assertions, 46 isolated API assertions, production build/type checking/artifact checks, zero dependency advisories, and live checks including authenticated read-only smoke tests. Browser sign-in, crew permissions and logout were checked against disposable local accounts.
