import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from dotenv import load_dotenv

# Load env variables from backend/.env
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
print(f"Loading env from: {env_path}")
load_dotenv(env_path)

smtp_host = os.getenv("SMTP_HOST", "")
smtp_port_str = os.getenv("SMTP_PORT", "587")
smtp_username = os.getenv("SMTP_USERNAME", "")
smtp_password = os.getenv("SMTP_PASSWORD", "")
smtp_use_ssl = os.getenv("SMTP_USE_SSL", "False").lower() in ("true", "1", "yes")
smtp_use_tls = os.getenv("SMTP_USE_TLS", "True").lower() in ("true", "1", "yes")

print(f"SMTP Config:")
print(f"  Host: {smtp_host}")
print(f"  Port: {smtp_port_str}")
print(f"  Username: {smtp_username}")
print(f"  Password Length: {len(smtp_password) if smtp_password else 0}")
print(f"  Use SSL: {smtp_use_ssl}")
print(f"  Use TLS: {smtp_use_tls}")

to_email = "verifymykid@gmail.com"
subject = "VerifyMyKid - SMTP Connection Test"
body = "This is a direct SMTP test email."

try:
    smtp_port = int(smtp_port_str)
    msg = MIMEMultipart()
    msg['From'] = smtp_username
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))
    
    if smtp_use_ssl:
        print("Connecting using SMTP_SSL...")
        server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10)
    else:
        print("Connecting using SMTP...")
        server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)
        if smtp_use_tls:
            print("Starting TLS...")
            server.starttls()
            
    if smtp_password:
        print("Logging in...")
        server.login(smtp_username, smtp_password)
        
    print("Sending mail...")
    server.sendmail(smtp_username, to_email, msg.as_string())
    server.quit()
    print("SUCCESS: SMTP connection and email delivery succeeded!")
except Exception as e:
    import traceback
    print("ERROR: SMTP connection failed!")
    traceback.print_exc()
