import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const files = fs.readdirSync('dist', { recursive: true }).filter(file => fs.statSync(path.join('dist', file)).isFile()).map(file => file.replaceAll('\\', '/'));
assert.ok(!files.some(file => /\.(sql|map|env)$|config\.php$/.test(file)), 'No SQL, sourcemaps or secrets in deployment');
for (const file of ['api.php', '.htaccess', '.user.ini', '_server/security.php', '_server/database.php', '_server/.htaccess']) assert.ok(files.includes(file), `${file} is packaged`);
for (const file of files.filter(file => file.endsWith('.js'))) {
  const content = fs.readFileSync(path.join('dist', file), 'utf8');
  assert.ok(!/VITE_API_KEY|GEMINI_API_KEY|X-Api-Key|generativelanguage\.googleapis\.com|u522832521_cineflow/.test(content), 'Browser bundle contains no backend keys or provider credentials');
}
console.log('Production artifact checks passed.');
