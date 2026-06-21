#!/usr/bin/env expect

set timeout 180
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

# Navigate to target directory and pull latest code
send "cd /var/www/verifymykid-backend\r"
expect "*# "

send "git status\r"
expect "*# "

send "git pull origin main\r"
expect "*# "

# Restart backend service to load new changes
send "systemctl restart verifymykid-backend.service\r"
expect "*# "

# Check service status to ensure it booted correctly
send "systemctl status verifymykid-backend.service --no-pager\r"
expect "*# "

send "exit\r"
expect eof
