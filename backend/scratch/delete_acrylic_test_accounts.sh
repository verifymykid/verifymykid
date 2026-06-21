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

send "python3 -c \"import sqlite3; conn = sqlite3.connect('/var/www/verifymykid-backend/backend/verifymykid.db'); c = conn.cursor(); c.execute(\\\"DELETE FROM parents WHERE schoolId = 'SCH-055B'\\\"); c.execute(\\\"DELETE FROM children WHERE parentId IN (SELECT id FROM parents WHERE schoolId = 'SCH-055B')\\\"); c.execute(\\\"DELETE FROM guardians WHERE schoolId = 'SCH-055B'\\\"); c.execute(\\\"DELETE FROM schools WHERE id = 'SCH-055B'\\\"); c.execute(\\\"DELETE FROM system_settings WHERE key LIKE '%SCH-055B%'\\\"); conn.commit(); conn.close(); print('=== CLEANUP COMPLETE ===')\"\r"
expect "*# "

send "exit\r"
expect eof
