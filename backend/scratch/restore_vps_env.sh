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

send "cd /var/www/verifymykid-backend/backend\r"
expect "*# "

# Write production .env file
send "cat << 'EOF' > .env\r"
sleep 1
send "DATABASE_URL=sqlite:///./verifymykid.db\r"
sleep 0.05
send "SMTP_HOST=smtp.gmail.com\r"
sleep 0.05
send "SMTP_PORT=465\r"
sleep 0.05
send "SMTP_USERNAME=verifymykid@gmail.com\r"
sleep 0.05
send "SMTP_PASSWORD=xnltojhpeoxuozuq\r"
sleep 0.05
send "SMTP_USE_SSL=True\r"
sleep 0.05
send "SMTP_USE_TLS=False\r"
sleep 0.05
send "SECRET_KEY=a7d2e8b15d2a938fc28abdf81eefc38d\r"
sleep 0.05
send "EOF\r"
expect "*# "

# Restart service
send "systemctl restart verifymykid-backend.service\r"
expect "*# "

# Verify status
send "systemctl status verifymykid-backend.service --no-pager\r"
expect "*# "

send "exit\r"
expect eof
