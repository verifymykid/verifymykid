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

send "cat /etc/systemd/system/verifymykid-backend.service\r"
expect "*# "

# Write the .env file
send "cat << 'EOF' > /var/www/verifymykid-backend/backend/.env\r"
send "SMTP_HOST=smtp.gmail.com\r"
send "SMTP_PORT=465\r"
send "SMTP_USERNAME=verifymykid@gmail.com\r"
send "SMTP_PASSWORD=xnltojhpeoxuozuq\r"
send "SMTP_USE_SSL=True\r"
send "SMTP_USE_TLS=False\r"
send "DATABASE_URL=sqlite:///./verifymykid.db\r"
send "SECRET_KEY=949f546c7ad89ee3a7cf49842c125df9\r"
send "EOF\r"
expect "*# "

# Restart service
send "systemctl daemon-reload && systemctl restart verifymykid-backend.service\r"
expect "*# "

# Check service status
send "systemctl status verifymykid-backend.service --no-pager\r"
expect "*# "

send "exit\r"
expect eof
