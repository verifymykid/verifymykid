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

send "echo '=== SCAN LOGS FOR SMTP WARNINGS ==='\r"
expect "*# "
send "journalctl -u verifymykid-backend.service --grep='SMTP credentials' --no-pager\r"
expect "*# "

send "exit\r"
expect eof
