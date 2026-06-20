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

send "cd /var/www/verifymykid-backend\r"
expect "*# "

# Clean untracked conflicting files and reset local changes if any
send "git clean -fd\r"
expect "*# "
send "git checkout -f\r"
expect "*# "

# Pull main branch
send "git pull origin main\r"
expect "*# "

# Restart service
send "systemctl restart verifymykid-backend.service\r"
expect "*# "

# Verify status
send "systemctl status verifymykid-backend.service --no-pager\r"
expect "*# "

send "exit\r"
expect eof
