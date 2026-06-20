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

# Navigate to target directory and pull latest code (including the migrate_db.py script)
send "cd /var/www/verifymykid-backend\r"
expect "*# "

send "git pull origin main\r"
expect "*# "

# Run migration script on VPS using backend virtual env
send "echo '=== RUNNING DB MIGRATION ON VPS ==='\r"
expect "*# "
send "/var/www/verifymykid-backend/backend/venv/bin/python /var/www/verifymykid-backend/backend/scratch/migrate_db.py\r"
expect "*# "

# Restart backend service to load new changes
send "systemctl restart verifymykid-backend.service\r"
expect "*# "

# Check service status
send "systemctl status verifymykid-backend.service --no-pager\r"
expect "*# "

send "exit\r"
expect eof
