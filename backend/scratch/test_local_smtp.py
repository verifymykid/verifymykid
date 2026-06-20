import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

to_email = "verifymykid@gmail.com"
subject = "VerifyMyKid - Local SMTP Test"
body = "This is a test email sent via local postfix on the VPS."

try:
    msg = MIMEMultipart()
    msg['From'] = "notifications@verifymykid.com"
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))
    
    print("Connecting to localhost:25...")
    server = smtplib.SMTP('localhost', 25, timeout=5)
    print("Sending mail...")
    server.sendmail("notifications@verifymykid.com", to_email, msg.as_string())
    server.quit()
    print("SUCCESS: Local SMTP worked!")
except Exception as e:
    print(f"FAILED: Local SMTP | error = {e}")
