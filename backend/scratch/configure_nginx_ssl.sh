#!/usr/bin/env expect

set timeout 300
set ip "168.231.112.221"
set user "root"
set pass "LEOVEOjco77&."
set domain "168-231-112-221.sslip.io"

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

# 1. Install Certbot Nginx plugin if not already installed
send "apt-get update && apt-get install -y certbot python3-certbot-nginx\r"
expect "*# "

# 2. Write Nginx server block config using braces and separate sends
send {echo "server {" > /etc/nginx/sites-available/verifymykid-backend}
send "\r"
expect "*# "

send {echo "    listen 80;" >> /etc/nginx/sites-available/verifymykid-backend}
send "\r"
expect "*# "

send "echo \"    server_name $domain;\" >> /etc/nginx/sites-available/verifymykid-backend\r"
expect "*# "

send {echo "" >> /etc/nginx/sites-available/verifymykid-backend}
send "\r"
expect "*# "

send {echo "    location / {" >> /etc/nginx/sites-available/verifymykid-backend}
send "\r"
expect "*# "

send {echo "        proxy_pass http://127.0.0.1:8001;" >> /etc/nginx/sites-available/verifymykid-backend}
send "\r"
expect "*# "

send {echo '        proxy_set_header Host $host;' >> /etc/nginx/sites-available/verifymykid-backend}
send "\r"
expect "*# "

send {echo '        proxy_set_header X-Real-IP $remote_addr;' >> /etc/nginx/sites-available/verifymykid-backend}
send "\r"
expect "*# "

send {echo '        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;' >> /etc/nginx/sites-available/verifymykid-backend}
send "\r"
expect "*# "

send {echo '        proxy_set_header X-Forwarded-Proto $scheme;' >> /etc/nginx/sites-available/verifymykid-backend}
send "\r"
expect "*# "

send {echo "    }" >> /etc/nginx/sites-available/verifymykid-backend}
send "\r"
expect "*# "

send {echo "}" >> /etc/nginx/sites-available/verifymykid-backend}
send "\r"
expect "*# "

# 3. Enable Nginx site block and test configuration
send "ln -sf /etc/nginx/sites-available/verifymykid-backend /etc/nginx/sites-enabled/\r"
expect "*# "
send "nginx -t\r"
expect "*# "

# 4. Restart Nginx to apply changes
send "systemctl restart nginx\r"
expect "*# "

# 5. Run Certbot to generate and install Let's Encrypt SSL
send "certbot --nginx -d $domain --non-interactive --agree-tos -m verifymykid@gmail.com\r"
expect "*# "

# 6. Verify Nginx is active
send "systemctl status nginx --no-pager\r"
expect "*# "

send "exit\r"
expect eof
