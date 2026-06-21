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

# Update service file to include PYTHONUNBUFFERED=1
send "cat << 'EOF' > /etc/systemd/system/verifymykid-backend.service
\[Unit\]
Description=VerifyMyKid FastAPI Backend
After=network.target

\[Service\]
User=root
WorkingDirectory=/var/www/verifymykid-backend/backend
EnvironmentFile=/var/www/verifymykid-backend/backend/.env
Environment=PYTHONUNBUFFERED=1
ExecStart=/var/www/verifymykid-backend/backend/venv/bin/gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8001
Restart=always

\[Install\]
WantedBy=multi-user.target
EOF\r"
expect "*# "

send "systemctl daemon-reload\r"
expect "*# "

# Navigate to target directory and pull latest code
send "cd /var/www/verifymykid-backend\r"
expect "*# "

send "git pull origin main\r"
expect "*# "

# Restart backend service
send "systemctl restart verifymykid-backend.service\r"
expect "*# "

# Check service status
send "systemctl status verifymykid-backend.service --no-pager\r"
expect "*# "

send "exit\r"
expect eof
