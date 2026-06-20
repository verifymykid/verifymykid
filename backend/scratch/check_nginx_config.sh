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

send "echo '=== SITES ENABLED ==='\r"
expect "*# "
send "ls -la /etc/nginx/sites-enabled/\r"
expect "*# "

send "echo '=== SITE: verifymykid-backend ==='\r"
expect "*# "
send "cat /etc/nginx/sites-available/verifymykid-backend\r"
expect "*# "

send "echo '=== SITE: default ==='\r"
expect "*# "
send "cat /etc/nginx/sites-enabled/default\r"
expect "*# "

send "exit\r"
expect eof
