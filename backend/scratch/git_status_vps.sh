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

send "cd /var/www/verifymykid-backend\r"
expect "*# "

send "git status\r"
expect "*# "

send "git diff\r"
expect "*# "

send "exit\r"
expect eof
