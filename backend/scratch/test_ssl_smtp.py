import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from dotenv import load_dotenv

# Load env variables from backend/.env
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
print(f"Loading env from: {env_path}")
load_dotenv(env_path)

smtp_host = "smtp.hostinger.com"
smtp_port = 465
smtp_username = os.getenv("SMTP_USERNAME", "")
smtp_password = os.getenv("SMTP_PASSWORD", "")

print(f"SMTP Config:")
print(f"  Host: {smtp_host}")
print(f"  Port: {smtp_port}")
print(f"  Username: {smtp_username}")
print(f"  Password Length: {len(smtp_password) if smtp_password else 0}")

to_email = "verifymykid@gmail.com"
subject = "VerifyMyKid - SMTP Connection Test SSL"
body = "This is a direct SMTP SSL test email."

try:
    msg = MIMEMultipart()
    msg['From'] = smtp_username
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))
    
    print("Connecting using SMTP_SSL on port 465...")
    server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10)
    
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
