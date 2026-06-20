#!/usr/bin/env expect

set timeout 60
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

# 1. Update the systemd service file to include EnvironmentFile
send "sed -i '/EnvironmentFile=/d' /etc/systemd/system/verifymykid-backend.service\r"
expect "*# "
send "sed -i '/WorkingDirectory=/a EnvironmentFile=/var/www/verifymykid-backend/backend/.env' /etc/systemd/system/verifymykid-backend.service\r"
expect "*# "

# 2. Print service file to verify
send "cat /etc/systemd/system/verifymykid-backend.service\r"
expect "*# "

# 3. Reload daemon and restart service
send "systemctl daemon-reload\r"
expect "*# "
send "systemctl restart verifymykid-backend.service\r"
expect "*# "

# 4. Check status
send "systemctl status verifymykid-backend.service --no-pager\r"
expect "*# "

# 5. Check environment variables of the running gunicorn process
send "sleep 2\r"
expect "*# "
send "for pid in \$(pgrep -f gunicorn); do echo \"PID \$pid env:\"; cat /proc/\$pid/environ | tr '\\0' '\\n' | grep -E 'SMTP|DATABASE|SECRET'; done\r"
expect "*# "

send "exit\r"
expect eof
