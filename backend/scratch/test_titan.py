import smtplib

smtp_hosts = ["smtp.titan.email", "smtp.hostinger.com", "mail.verifymykid.com"]
smtp_username = "notifications@verifymykid.com"
password = "LEOVEOjco77&."

print("Starting Titan/Hostinger SMTP tests...")

for host in smtp_hosts:
    # Try Port 465 SSL
    try:
        print(f"Trying {host} on port 465 (SSL)...")
        server = smtplib.SMTP_SSL(host, 465, timeout=5)
        server.login(smtp_username, password)
        print(f"SUCCESS: {host} on 465 SSL works!")
        server.quit()
        break
    except Exception as e:
        print(f"FAILED: {host} on 465 SSL | error = {e}")
        
    # Try Port 587 TLS
    try:
        print(f"Trying {host} on port 587 (TLS)...")
        server = smtplib.SMTP(host, 587, timeout=5)
        server.starttls()
        server.login(smtp_username, password)
        print(f"SUCCESS: {host} on 587 TLS works!")
        server.quit()
        break
    except Exception as e:
        print(f"FAILED: {host} on 587 TLS | error = {e}")
