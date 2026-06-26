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

send "journalctl -u verifymykid-backend.service --no-pager | grep -A 10 -B 2 'POST /api/parents/' || echo 'No errors found'\r"
expect "*# "

send "exit\r"
expect eof
