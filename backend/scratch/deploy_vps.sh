#!/usr/bin/env expect

set timeout 300
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

# 1. Update packages and install git and python
send "apt-get update && apt-get install -y git python3-pip python3-venv\r"
expect "*# "

# 2. Create target isolated directory
send "mkdir -p /var/www/verifymykid-backend\r"
expect "*# "

send "cd /var/www/verifymykid-backend\r"
expect "*# "

# 3. Pull public repo from GitHub
send "git init && git remote add origin https://github.com/verifymykid/verifymykid.git && git pull origin main\r"
expect "*# "

# 4. Navigate to backend and setup venv
send "cd backend\r"
expect "*# "

send "python3 -m venv venv\r"
expect "*# "

# 5. Install Python dependencies
send "./venv/bin/pip install --upgrade pip\r"
expect "*# "

send "./venv/bin/pip install -r requirements.txt gunicorn uvicorn\r"
expect "*# "

# 6. Write production .env file (using braces to prevent interpolation)
send {cat << 'EOF' > .env
DATABASE_URL=sqlite:///./verifymykid.db
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USERNAME=verifymykid@gmail.com
SMTP_PASSWORD=xnltojhpeoxuozuq
SMTP_USE_SSL=True
SMTP_USE_TLS=False
SECRET_KEY=a7d2e8b15d2a938fc28abdf81eefc38d
EOF} ; send "\r"
expect "*# "

# 7. Setup Systemd Service (using braces to bypass expect square-bracket parsing)
send {echo "[Unit]" > /etc/systemd/system/verifymykid-backend.service} ; send "\r"
expect "*# "
send {echo "Description=VerifyMyKid FastAPI Backend" >> /etc/systemd/system/verifymykid-backend.service} ; send "\r"
expect "*# "
send {echo "After=network.target" >> /etc/systemd/system/verifymykid-backend.service} ; send "\r"
expect "*# "
send {echo "" >> /etc/systemd/system/verifymykid-backend.service} ; send "\r"
expect "*# "
send {echo "[Service]" >> /etc/systemd/system/verifymykid-backend.service} ; send "\r"
expect "*# "
send {echo "User=root" >> /etc/systemd/system/verifymykid-backend.service} ; send "\r"
expect "*# "
send {echo "WorkingDirectory=/var/www/verifymykid-backend/backend" >> /etc/systemd/system/verifymykid-backend.service} ; send "\r"
expect "*# "
send {echo "ExecStart=/var/www/verifymykid-backend/backend/venv/bin/gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8001" >> /etc/systemd/system/verifymykid-backend.service} ; send "\r"
expect "*# "
send {echo "Restart=always" >> /etc/systemd/system/verifymykid-backend.service} ; send "\r"
expect "*# "
send {echo "" >> /etc/systemd/system/verifymykid-backend.service} ; send "\r"
expect "*# "
send {echo "[Install]" >> /etc/systemd/system/verifymykid-backend.service} ; send "\r"
expect "*# "
send {echo "WantedBy=multi-user.target" >> /etc/systemd/system/verifymykid-backend.service} ; send "\r"
expect "*# "

# 8. Start and enable systemd daemon service
send "systemctl daemon-reload && systemctl enable verifymykid-backend && systemctl restart verifymykid-backend\r"
expect "*# "

# 9. Verify local health response
send "curl -s http://127.0.0.1:8001/api/status\r"
expect "*# "

# 10. Print service running logs
send "systemctl status verifymykid-backend --no-pager\r"
expect "*# "

# 11. Exit VPS
send "exit\r"
expect eof
