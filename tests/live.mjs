// Non-destructive checks for the deployed production app. No credentials needed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const origin = 'https://ghostwhite-sardine-651089.hostingersite.com';
let checks = 0;
const check = (condition, name) => { assert.ok(condition, name); checks++; };
const index = await fetch(origin, { redirect: 'manual', cache: 'no-store' });
check(index.status === 200, 'site is reachable');
for (const [name, pattern] of [['strict-transport-security', /max-age=31536000/], ['x-frame-options', /DENY/], ['x-content-type-options', /nosniff/], ['referrer-policy', /strict-origin-when-cross-origin/], ['permissions-policy', /camera=\(\).*microphone=\(\).*geolocation=\(\)/], ['content-security-policy', /script-src 'self'/]]) {
  check(pattern.test(index.headers.get(name) || ''), name);
}
check(!index.headers.has('x-powered-by'), 'PHP fingerprint is removed');
const http = await fetch(origin.replace('https:', 'http:') + '/?check=https', { redirect: 'manual' });
check([301, 302, 307, 308].includes(http.status) && http.headers.get('location')?.startsWith(origin), 'HTTP redirects to canonical HTTPS origin');
let session = await fetch(origin + '/api.php?action=session', { cache: 'no-store' });
check(session.status === 200, 'private configuration and database work');
const cookie = session.headers.get('set-cookie') || '';
check(/__Host-omega_session=/.test(cookie) && /secure/i.test(cookie) && /httponly/i.test(cookie) && /samesite=lax/i.test(cookie), 'secure host-only session cookie');
const body = await session.json();
check(body.user === null && /^[a-f0-9]{64}$/.test(body.csrfToken), 'anonymous session does not grant a role');
const unauthenticated = await fetch(origin + '/api.php?action=items');
check(unauthenticated.status === 401, 'inventory requires authentication');
const legacyKey = await fetch(origin + '/api.php?action=items', { headers: { 'X-Api-Key': 'obsolete-client-key' } });
check(legacyKey.status === 401, 'API key cannot bypass login');
const csrf = await fetch(origin + '/api.php?action=login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
check(csrf.status === 419, 'missing CSRF is rejected');
const cross = await fetch(origin + '/api.php?action=session', { headers: { Origin: 'https://attacker.example' } });
check(cross.status === 403, 'cross-origin access is rejected');
const upload = await fetch(origin + '/api.php?action=create_item', { method: 'POST', headers: { 'Content-Type': 'multipart/form-data; boundary=security-audit' }, body: '--security-audit--\r\n' });
check(upload.status === 403, 'multipart uploads are rejected before PHP');
for (const path of ['/.env', '/.git/config', '/db_setup.sql', '/_server/security.php', '/.user.ini', '/.builds/']) {
  const result = await fetch(origin + path, { redirect: 'manual' });
  check([403, 404].includes(result.status), `${path} is not publicly accessible`);
}
// Optional local-only authenticated smoke check: read production data, then log out.
if (process.env.OMEGA_SMOKE_CREDENTIALS) {
  const credentials = JSON.parse(fs.readFileSync(process.env.OMEGA_SMOKE_CREDENTIALS, 'utf8'));
  const loginName = credentials.login || 'omega-admin';
  const expectedRole = credentials.role || 'admin';
  let authCookie = cookie.split(';')[0];
  const login = await fetch(origin + '/api.php?action=login', { method: 'POST', headers: { Cookie: authCookie, 'X-CSRF-Token': body.csrfToken, 'Content-Type': 'application/json' }, body: JSON.stringify({ login: loginName, password: credentials.password }) });
  check(login.status === 200, 'provisioned user can sign in');
  const user = await login.json();
  authCookie = login.headers.get('set-cookie')?.split(';')[0] || authCookie;
  check(user.user?.role === expectedRole, 'expected user role comes from database');
  if (loginName === 'user') check(user.user?.read_only === true, 'public demo identity is read-only');
  for (const action of ['items', 'categories', 'productions', 'profiles', 'logs']) {
    const result = await fetch(origin + '/api.php?action=' + action, { headers: { Cookie: authCookie } });
    check(result.status === 200 && Array.isArray(await result.json()), `${action} loads for signed-in user`);
  }
  if (expectedRole === 'crew') {
    for (const action of ['create_item', 'change_status']) {
      // Empty bodies cannot mutate inventory even if a permission check regresses.
      const result = await fetch(origin + '/api.php?action=' + action, { method: 'POST', headers: { Cookie: authCookie, 'X-CSRF-Token': user.csrfToken, 'Content-Type': 'application/json' }, body: '{}' });
      check(result.status === 403, `${action} is forbidden for a regular user`);
    }
  }
  if (loginName === 'user') {
    for (const action of ['checkout', 'return', 'advice']) {
      const result = await fetch(origin + '/api.php?action=' + action, { method: 'POST', headers: { Cookie: authCookie, 'X-CSRF-Token': user.csrfToken, 'Content-Type': 'application/json' }, body: '{}' });
      check(result.status === 403, `${action} is forbidden for the public visitor`);
    }
  }
  const logout = await fetch(origin + '/api.php?action=logout', { method: 'POST', headers: { Cookie: authCookie, 'X-CSRF-Token': user.csrfToken, 'Content-Type': 'application/json' }, body: '{}' });
  check(logout.status === 200, 'logout succeeds');
  const replay = await fetch(origin + '/api.php?action=items', { headers: { Cookie: authCookie } });
  check(replay.status === 401, 'logged-out session cannot be replayed');
}
console.log(`${checks} live security checks passed.`);
