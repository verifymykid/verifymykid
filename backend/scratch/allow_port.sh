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
        # Logged in successfully
    }
}

# Allow port 8001 in the internal UFW firewall
send "ufw allow 8001/tcp\r"
expect "*# "

# Reload UFW to apply the rule
send "ufw reload\r"
expect "*# "

# Check the UFW status to verify
send "ufw status\r"
expect "*# "

send "exit\r"
expect eof
