import sqlite3

conn = sqlite3.connect('/var/www/verifymykid-backend/backend/verifymykid.db')
cursor = conn.cursor()
cursor.execute("select id, name, email, password from guardians where name like '%Joena%'")
rows = cursor.fetchall()
print("QUERY RESULTS:")
for r in rows:
    print(f"ID: {r[0]}")
    print(f"Name: {r[1]} (length: {len(r[1])})")
    print(f"Email: {r[2]}")
    print(f"Password hash: {r[3]}")
conn.close()
