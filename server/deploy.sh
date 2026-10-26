#!/usr/bin/env bash
# Installed outside the webroot and invoked by a restricted SSH deployment key.
set -euo pipefail
umask 077
private_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
domain="$(dirname -- "$private_dir")"
[[ "$domain" == "$HOME/domains/ghostwhite-sardine-651089.hostingersite.com" ]] || exit 1
exec 9>"$private_dir/deploy.lock"
flock -n 9 || { echo 'Another deployment is running.' >&2; exit 1; }
mkdir -p "$private_dir/backups" "$domain/.releases"
archive="$(mktemp "$private_dir/release.XXXXXX.tar.gz")"
stage="$(mktemp -d "$domain/.releases/release.XXXXXX")"
cleanup() {
    rm -f -- "$archive"
    case "$stage" in "$domain"/.releases/release.*) if [[ -d "$stage" ]]; then rm -rf -- "$stage"; fi ;; esac
}
trap cleanup EXIT
# Bound disk usage even if a deployment key is misused.
head -c 10485761 > "$archive"
[[ "$(wc -c < "$archive")" -le 10485760 ]] || { echo 'Archive too large.' >&2; exit 1; }
tar -tzf "$archive" > "$private_dir/archive-list.txt"
if grep -Ev '^(index\.html|api\.php|\.htaccess|\.user\.ini|_server/?|_server/(security\.php|database\.php|\.htaccess)|assets/?|assets/[A-Za-z0-9._-]+)$' "$private_dir/archive-list.txt"; then
    echo 'Unexpected archive path.' >&2; exit 1
fi
# Reject symlinks, hardlinks, devices and all special archive entries.
if tar -tvzf "$archive" | grep -Ev '^[-d]'; then echo 'Unsafe archive entry.' >&2; exit 1; fi
tar -tvzf "$archive" | awk '{ total += $3; count++ } END { if (total > 52428800 || count > 1000) exit 1 }'
tar -xzf "$archive" -C "$stage" --no-same-owner --no-same-permissions
for required in index.html api.php .htaccess .user.ini _server/security.php _server/database.php _server/.htaccess; do
    [[ -f "$stage/$required" ]] || { echo "Missing $required" >&2; exit 1; }
done
for file in "$stage/api.php" "$stage"/_server/*.php; do php -l "$file"; done
php -r '$c=require $argv[1]; mysqli_report(MYSQLI_REPORT_ERROR|MYSQLI_REPORT_STRICT); $d=new mysqli($c["db_host"],$c["db_user"],$c["db_password"],$c["db_name"]); $r=$d->query("SELECT COUNT(*) AS n FROM omega_accounts a JOIN profiles p ON p.id=a.profile_id WHERE a.disabled=0 AND p.role=\"admin\"")->fetch_assoc(); if ((int)$r["n"]<1) exit(1);' "$private_dir/config.php"
chmod -R u=rwX,go=rX "$stage"
backup="$private_dir/backups/public_html-$(date -u +%Y%m%dT%H%M%S)-$$"
mv -- "$domain/public_html" "$backup"
if ! mv -- "$stage" "$domain/public_html"; then mv -- "$backup" "$domain/public_html"; exit 1; fi
chmod 700 "$backup"
echo "Deployed. Private backup: $backup"
