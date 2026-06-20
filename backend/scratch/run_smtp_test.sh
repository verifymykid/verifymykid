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

# Run live SMTP test on VPS
send "echo '=== RUNNING SMTP TEST ON VPS ==='\r"
expect "*# "
send "/var/www/verifymykid-backend/backend/venv/bin/python /var/www/verifymykid-backend/backend/scratch/test_vps_smtp.py\r"
expect "*# "

send "exit\r"
expect eof
