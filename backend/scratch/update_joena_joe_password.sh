#!/usr/bin/env expect

set timeout 30
set ip "168.231.112.221"
set user "root"
set pass "LEOVEOjco77&."

spawn ssh -o StrictHostKeyChecking=no $user@$ip

expect {
    "*password:" {
        send "$pass\r"
        exp_continue
    }
    "*# " {
        # Logged in
    }
}

send "/var/www/verifymykid-backend/backend/venv/bin/python -c \"import sys; sys.path.append('/var/www/verifymykid-backend/backend'); from security import get_password_hash; import sqlite3; conn = sqlite3.connect('/var/www/verifymykid-backend/backend/verifymykid.db'); c = conn.cursor(); new_hash = get_password_hash('admin123'); c.execute(\\\"UPDATE guardians SET password = ? WHERE name = 'Joena joe'\\\", (new_hash,)); conn.commit(); conn.close(); print('=== PASSWORD UPDATED ===')\"\r"
expect "*# "

send "exit\r"
expect eof
