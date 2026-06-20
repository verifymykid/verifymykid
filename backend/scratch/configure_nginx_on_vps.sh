#!/usr/bin/env expect

set timeout 120
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

# 1. Back up existing files
send "cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.bak\r"
expect "*# "

# 2. Write clean default configuration
send "cat << 'EOF' > /etc/nginx/sites-available/default\n"
send "server {\n"
send "    listen 80 default_server;\n"
send "    listen \[::\]:80 default_server;\n"
send "    root /var/www/html;\n"
send "    index index.html index.htm index.nginx-debian.html;\n"
send "    server_name _;\n"
send "    location / {\n"
send "        try_files \$uri \$uri/ =404;\n"
send "    }\n"
send "}\n"
send "EOF\n"
expect "*# "

# 3. Write proxy configurations to verifymykid-backend
send "cat << 'EOF' > /etc/nginx/sites-available/verifymykid-backend\n"
send "server {\n"
send "    server_name 168-231-112-221.sslip.io;\n"
send "\n"
send "    location / {\n"
send "        proxy_pass http://127.0.0.1:8001;\n"
send "        proxy_set_header Host \$host;\n"
send "        proxy_set_header X-Real-IP \$remote_addr;\n"
send "        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;\n"
send "        proxy_set_header X-Forwarded-Proto \$scheme;\n"
send "    }\n"
send "\n"
send "    listen \[::\]:443 ssl ipv6only=on; # managed by Certbot\n"
send "    listen 443 ssl; # managed by Certbot\n"
send "    ssl_certificate /etc/letsencrypt/live/168-231-112-221.sslip.io/fullchain.pem; # managed by Certbot\n"
send "    ssl_certificate_key /etc/letsencrypt/live/168-231-112-221.sslip.io/privkey.pem; # managed by Certbot\n"
send "    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot\n"
send "    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot\n"
send "}\n"
send "server {\n"
send "    if (\$host = 168-231-112-221.sslip.io) {\n"
send "        return 301 https://\$host\$request_uri;\n"
send "    } # managed by Certbot\n"
send "\n"
send "    listen 80;\n"
send "    listen \[::\]:80;\n"
send "    server_name 168-231-112-221.sslip.io;\n"
send "    return 404; # managed by Certbot\n"
send "}\n"
send "EOF\n"
expect "*# "

# 4. Enable site block via symlink (if not already enabled)
send "ln -sf /etc/nginx/sites-available/verifymykid-backend /etc/nginx/sites-enabled/\r"
expect "*# "

# 5. Test nginx configuration
send "nginx -t\r"
expect "*# "

# 6. Restart/Reload nginx to apply
send "systemctl restart nginx\r"
expect "*# "

send "exit\r"
expect eof
