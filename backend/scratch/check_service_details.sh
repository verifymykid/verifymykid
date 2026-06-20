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

send "echo '=== SYSTEMD SERVICE FILE ==='\r"
expect "*# "
send "cat /etc/systemd/system/verifymykid-backend.service\r"
expect "*# "

send "echo '=== ENVS ON VPS ==='\r"
expect "*# "
send "cat /var/www/verifymykid-backend/.env\r"
expect "*# "

send "echo '=== CURRENT VPS DATE ==='\r"
expect "*# "
send "date\r"
expect "*# "

send "exit\r"
expect eof
