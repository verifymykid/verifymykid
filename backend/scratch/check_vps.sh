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

# 1. Check listening sockets
send "ss -tuln | grep 8001\r"
expect "*# "

# 2. Check UFW firewall status
send "ufw status\r"
expect "*# "

# 3. Check iptables rules for port 8001
send "iptables -L -n -v | grep 8001\r"
expect "*# "

send "exit\r"
expect eof
