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

# Create scratch directory if not exists
send "mkdir -p /var/www/verifymykid-backend/backend/scratch\r"
expect "*# "

# Open the file on VPS for writing
send "cat << 'EOF' > /var/www/verifymykid-backend/backend/scratch/test_local_smtp.py\r"
sleep 1

# Read local file content and send it line by line
set fp [open "backend/scratch/test_local_smtp.py" r]
while {[gets $fp line] >= 0} {
    send "$line\r"
    sleep 0.05
}
close $fp

send "EOF\r"
expect "*# "

send "echo '=== RUNNING LOCAL SMTP TEST ON VPS ==='\r"
expect "*# "
send "/var/www/verifymykid-backend/backend/venv/bin/python /var/www/verifymykid-backend/backend/scratch/test_local_smtp.py\r"
expect "*# "

send "exit\r"
expect eof
