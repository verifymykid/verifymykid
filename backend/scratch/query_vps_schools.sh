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

send "python3 -c \"import sqlite3; conn = sqlite3.connect('/var/www/verifymykid-backend/backend/verifymykid.db'); c = conn.cursor(); c.execute('SELECT type, timestamp, details FROM system_logs WHERE details LIKE \\'%Joena joe%\\''); print('=== LOGS ==='); \[print(row) for row in c.fetchall()\]\"\r"
expect "*# "

send "exit\r"
expect eof
