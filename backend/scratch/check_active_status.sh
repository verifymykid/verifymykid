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

send "echo '=== SERVICE STATUS ==='\r"
expect "*# "
send "systemctl status verifymykid-backend.service | grep Active\r"
expect "*# "

send "echo '=== RECENT SERVICE LOGS ==='\r"
expect "*# "
send "journalctl -u verifymykid-backend.service --since '2026-06-19 00:00:00' --no-pager | tail -n 50\r"
expect "*# "

send "echo '=== CHECK ENV FOR RUNNING SERVICE ==='\r"
expect "*# "
send "pidof gunicorn\r"
expect "*# "
send "cat /proc/\$(pidof gunicorn | awk '{print \$1}')/environ | tr '\\0' '\\n' | grep SMTP\r"
expect "*# "

send "exit\r"
expect eof
