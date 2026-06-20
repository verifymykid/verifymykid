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

send "echo '=== SITE: authscan ==='\r"
expect "*# "
send "cat /etc/nginx/sites-available/authscan\r"
expect "*# "

send "exit\r"
expect eof
