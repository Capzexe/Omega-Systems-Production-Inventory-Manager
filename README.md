# Omega Systems — Production Inventory Manager

A production equipment tracker for film and video teams. It helps warehouse staff and crews see available gear, assign equipment to productions, record returns and maintenance, and trace equipment movements to signed-in users.

**Live application:** [Omega Systems](https://ghostwhite-sardine-651089.hostingersite.com) — account required. No public demo credentials.

## Key Features

- **Equipment operations:** Track cameras, lenses, lighting, audio and power equipment by serial number, category, availability and maintenance status.
- **Production assignments:** Check equipment out to an active production and return it to inventory, with transactions protecting conflicting assignments.
- **Role-based access:** Administrators manage equipment; crew check out and return their own assignments. Permissions are enforced by PHP.
- **Activity history:** Record the authenticated actor and equipment transitions for operational review.
- **Responsive interface:** Dashboard, inventory filters, production manifests and bulk checkout/return workflows.
- **Optional AI recommendations:** Filming equipment suggestions through an authenticated server proxy. Requires a server-only Gemini key; disabled until configured.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide icons.
- **Backend:** Standalone PHP 8.2+ with mysqli/mysqlnd; cURL for optional AI.
- **Database & hosting:** MySQL/MariaDB with InnoDB on Hostinger; Apache/LiteSpeed-compatible configuration.
- **Deployment:** GitHub Actions with security tests, locked dependencies and restricted SSH.
- **Third-party services:** Optional Gemini API; Google Fonts and external avatar images.

This is not a Laravel application. `schema.sql` is a historical Supabase/PostgreSQL design; the current API uses the MySQL schema in `db_setup.sql`.

## Technical Architecture & Decisions

- **Relational storage:** Equipment, productions, profiles and audit events use foreign keys. Transactions and row locks keep assignments and their audit entries together.
- **Same-origin sessions:** PHP owns identity and permissions. Secure HttpOnly cookies and CSRF tokens replace the former browser-shipped API key, so downloaded JavaScript grants no backend privileges.
- **Shared-host deployment:** Vite builds static assets alongside the PHP bridge. Runtime credentials and session/limiter files live outside `public_html`; CI packages only intended public files.

## Local Setup

Requirements: Node.js 22+, npm, PHP 8.2+ with mysqli/mysqlnd and cURL, and MySQL/MariaDB.

```sh
git clone https://github.com/Capzexe/Omega-Systems-Production-Inventory-Manager.git
cd Omega-Systems-Production-Inventory-Manager
npm ci
```

For a frontend sandbox, run `npm run dev`, visit `http://localhost:3000`, and explicitly opt in from the browser console:

```js
localStorage.setItem('OMEGA_DB_MODE', 'mock'); location.reload();
```

This switch works only in development. Production requires a real session. To leave the sandbox, remove that localStorage key and reload.

For a complete local installation:

1. Create a **new development database**. Import `db_setup.sql` into it, then `database/migrations/001_security.sql`. **Never run db_setup.sql on production: it drops and reseeds tables.**
2. Create a private directory outside `public/` and `dist/`. Copy `server/config.example.php` into it as `config.php`. Fill in local database values, set `environment` to `local`, `origin` to `http://localhost:3000`, and `private_dir` to that private directory. Use a database user with a nonempty password. No `.env` file or browser secret is required.
3. Create an account for an existing profile. Supply a strong password via stdin/a protected local password file:

   ```sh
   php tools/manage-user.php /absolute/private/config.php u1 local-admin < /absolute/private/password.txt
   ```

4. Start PHP with `OMEGA_CONFIG_FILE` pointing to that private config, then start Vite in another terminal:

   ```sh
   OMEGA_CONFIG_FILE=/absolute/private/config.php php -S 127.0.0.1:8080 -t public
   npm run dev
   ```

   PowerShell equivalent for the PHP terminal:

   ```powershell
   $env:OMEGA_CONFIG_FILE = 'C:\absolute\private\config.php'
   php -S 127.0.0.1:8080 -t public
   ```

5. Visit `http://localhost:3000` and sign in. Vite proxies `/api.php` to the local PHP server. For a production build, serve `dist/` with PHP behind HTTPS; Vite's preview server does not execute PHP.

## Validation & Security Audit

```sh
npm run typecheck
npm run test:security
npm run build
npm run test:artifact
npm audit --audit-level=moderate
```

See [the security audit](docs/SECURITY-AUDIT.md) for findings, exploit scenarios, code locations, PHP server settings, integration tests and operational limitations.

## Hostinger Deployment

Pushes to `main` run `.github/workflows/deploy.yml`: type checking, PHP/security tests, an isolated MariaDB/API test suite, dependency audit, production build and artifact checks. After validation, the workflow sends the release over a dedicated SSH key restricted to this application's deployment script and verifies live access controls.

Runtime config is `domains/ghostwhite-sardine-651089.hostingersite.com/omega-private/config.php`, outside `public_html`. The additive security migration and first administrator must be provisioned before deployment. `tools/hostinger-provision.php` is a one-time CLI helper for this installation; never upload it into the public build.

Required GitHub secrets: `HOSTINGER_SSH_KEY` and `HOSTINGER_KNOWN_HOSTS`. Database passwords and AI keys are not build inputs. The remote `omega-private/deploy.sh` validates the archive and private config before replacing the release, retaining the previous directory in private backups. Apply system-level PHP settings through hPanel as described in the audit.

## Future Improvements

- Individual account administration, MFA and audited self-service password recovery.
- Paginated inventory/history, reservations and production due-date reminders; optional private equipment attachments with MIME/size validation.
