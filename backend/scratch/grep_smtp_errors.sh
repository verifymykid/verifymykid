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

send "echo '=== SYSTEMD SERVICE RECENT ERROR LOGS ==='\r"
expect "*# "
send "journalctl -u verifymykid-backend.service --no-pager | grep -i -E 'email|smtp|success|warning|error' | tail -n 100\r"
expect "*# "

send "exit\r"
expect eof
