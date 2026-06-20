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

send "echo '=== RECENT SMTP LOGS FROM DB ==='\r"
expect "*# "
send "python3 -c \"import sqlite3; conn = sqlite3.connect('/var/www/verifymykid-backend/backend/verifymykid.db'); c = conn.cursor(); c.execute('SELECT * FROM smtp_logs ORDER BY id DESC LIMIT 10'); print(c.fetchall())\"\r"
expect "*# "

send "echo '=== SYSTEM SETTINGS FROM DB ==='\r"
expect "*# "
send "python3 -c \"import sqlite3; conn = sqlite3.connect('/var/www/verifymykid-backend/backend/verifymykid.db'); c = conn.cursor(); c.execute('SELECT * FROM system_settings'); print(c.fetchall())\"\r"
expect "*# "

send "exit\r"
expect eof
