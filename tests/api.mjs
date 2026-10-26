// Run only against tests/setup-db.php's isolated database, never production.
import assert from 'node:assert/strict';
const base = 'http://127.0.0.1:8080/api.php';
let checks = 0;
function client() {
  return { cookie: '', token: '', async call(action, data, expected = 200, extraHeaders = {}) {
    const response = await fetch(`${base}?action=${action}`, { method: data === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', Cookie: this.cookie, 'X-CSRF-Token': this.token, ...extraHeaders }, ...(data === undefined ? {} : { body: JSON.stringify(data) }), redirect: 'manual' });
    const body = await response.json();
    assert.equal(response.status, expected, `${action}: ${JSON.stringify(body)}`); checks++;
    const cookie = response.headers.get('set-cookie');
    if (cookie) this.cookie = cookie.split(';')[0];
    if (body.csrfToken) this.token = body.csrfToken;
    return { body, response };
  }};
}
const anonymous = client();
const initial = await anonymous.call('items', undefined, 401);
await anonymous.call('session', undefined, 403, { Origin: 'https://attacker.example' });
await anonymous.call('login', { login: 'admin', password: 'wrong' }, 419);
await anonymous.call('session');
assert.match(initial.response.headers.get('set-cookie'), /HttpOnly/i); checks++;
assert.match(initial.response.headers.get('set-cookie'), /SameSite=Lax/i); checks++;
assert.equal(initial.response.headers.get('x-content-type-options'), 'nosniff'); checks++;
assert.match(initial.response.headers.get('cache-control'), /no-store/); checks++;
const before = anonymous.cookie;
const admin = anonymous;
const login = await admin.call('login', { login: 'admin', password: 'Test-only-password-123!' });
assert.equal(login.body.user.role, 'admin'); checks++;
assert.notEqual(admin.cookie, before); checks++;
await admin.call('create_item', { name: 'x', category_id: '1', status: 'available', role: 'admin' }, 422);
await admin.call('create_item', { name: ['nested'], category_id: '1', status: 'available' }, 422);
await admin.call('create_item', { name: 'x', category_id: '1', status: 'checked_out' }, 422);
await admin.call('create_item', { name: 'x', category_id: 'does-not-exist', status: 'available' }, 404);
const { body: created } = await admin.call('create_item', { name: "Camera ' OR 1=1 --", model: 'integration test', category_id: '1', status: 'available' }, 201);
const crew = client();
await crew.call('session');
await crew.call('login', { login: 'crew', password: 'Test-only-password-123!' });
await crew.call('create_item', { name: 'x', category_id: '1', status: 'available' }, 403);
await crew.call('change_status', { id: created.id, status: 'lost' }, 403);
await crew.call('checkout', { itemId: created.id, userId: 'u1', prodId: 'p1' }, 403);
await crew.call('checkout', { itemId: created.id, userId: 'u2', prodId: 'p1' }, 200);
await admin.call('checkout', { itemId: created.id, userId: 'u1', prodId: 'p1' }, 409);
await admin.call('change_status', { id: created.id, status: 'available' }, 409);
await crew.call('return', { itemId: created.id }, 200);
await crew.call('return', { itemId: created.id }, 403);
await admin.call('checkout', { itemId: created.id, userId: 'u1', prodId: 'p1' });
await crew.call('return', { itemId: created.id }, 403);
await admin.call('return', { itemId: created.id });
await admin.call('checkout', { itemId: 'does-not-exist', userId: 'u1', prodId: 'p1' }, 404);
await admin.call('change_status', { id: created.id, status: 'maintenance' });
await crew.call('checkout', { itemId: created.id, userId: 'u2', prodId: 'p1' }, 409);
const { body: logs } = await admin.call('logs');
const checkout = logs.find(log => log.item_id === created.id && log.action === 'Checkout' && log.details.assigned_to_id === 'u2');
assert.equal(checkout.user_id, 'u2'); checks++;
const adminCheckout = logs.find(log => log.item_id === created.id && log.action === 'Checkout' && log.details.assigned_to_id === 'u1');
assert.equal(adminCheckout.user_id, 'u1'); checks++;
await admin.call('advice', { prompt: 'Example scene' }, 503);
const stolen = client(); stolen.cookie = crew.cookie; stolen.token = crew.token;
await crew.call('logout', {});
await stolen.call('items', undefined, 401);
await crew.call('items', undefined, 401);
await admin.call('items', {}, 405);
await admin.call('not-an-endpoint', undefined, 404);
const badJson = await fetch(`${base}?action=create_item`, { method: 'POST', headers: { Cookie: admin.cookie, 'X-CSRF-Token': admin.token, 'Content-Type': 'application/json' }, body: '{' });
assert.equal(badJson.status, 400); checks++;
const wrongType = await fetch(`${base}?action=create_item`, { method: 'POST', headers: { Cookie: admin.cookie, 'X-CSRF-Token': admin.token, 'Content-Type': 'text/plain' }, body: '{}' });
assert.equal(wrongType.status, 415); checks++;
const oversized = await fetch(`${base}?action=create_item`, { method: 'POST', headers: { Cookie: admin.cookie, 'X-CSRF-Token': admin.token, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'x'.repeat(17000) }) });
assert.equal(oversized.status, 413); checks++;
const brute = client(); await brute.call('session');
let throttled = false;
for (let i = 0; i < 11; i++) {
  const response = await fetch(`${base}?action=login`, { method: 'POST', headers: { Cookie: brute.cookie, 'X-CSRF-Token': brute.token, 'Content-Type': 'application/json' }, body: JSON.stringify({ login: "unknown' OR 1=1", password: 'invalid-password' }) });
  if (response.status === 429) { assert.ok(Number(response.headers.get('retry-after')) > 0); throttled = true; break; }
  assert.equal(response.status, 401);
}
assert.ok(throttled, 'login brute force must be throttled'); checks++;
console.log(`${checks} API integration assertions passed.`);
