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

send "python3 -c \"import sqlite3; conn=sqlite3.connect('/var/www/verifymykid-backend/verifymykid.db'); c=conn.cursor(); c.execute('SELECT id, name, email, status FROM parents'); print(c.fetchall())\"\r"
expect "*# "

send "python3 -c \"import sqlite3; conn=sqlite3.connect('/var/www/verifymykid-backend/verifymykid.db'); c=conn.cursor(); c.execute(\\\"SELECT id, name, email, status FROM parents WHERE name LIKE '%Peters%' OR email LIKE '%Peters%' OR id LIKE '%Peters%'\\\"); print(c.fetchall())\"\r"
expect "*# "

send "exit\r"
expect eof
