import sqlite3

DB_PATH = "/Users/ekeneanyaegbu/Documents/Verifymykid/backend/verifymykid.db"

def clear_all_tables():
    tables = [
        'schools', 'parents', 'guardians', 'pickup_logs', 'system_logs',
        'notifications', 'payment_records', 'smtp_logs', 'active_alerts',
        'user_sessions', 'children', 'temporary_authorizations'
    ]
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print("--------------------------------------------------")
    print("CLEARING DATABASE FOR PRODUCTION DEPLOYMENT")
    print("--------------------------------------------------")
    
    for table in tables:
        try:
            cursor.execute(f"DELETE FROM {table};")
            print(f"-> Cleared all records from table: {table}")
        except Exception as e:
            print(f"-> Failed to clear table {table}: {e}")
            
    try:
        cursor.execute("VACUUM;")
        print("-> Reclaimed unused database disk space (VACUUM completed).")
    except Exception as e:
        print(f"-> VACUUM failed: {e}")
        
    conn.commit()
    conn.close()
    
    print("\nDATABASE STATUS CHECK:")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    for table in tables:
        cursor.execute(f"SELECT COUNT(*) FROM {table};")
        count = cursor.fetchone()[0]
        print(f"Table '{table}': {count} records")
    conn.close()
    print("--------------------------------------------------")
    print("DATABASE IS EMPTY AND READY FOR PRODUCTION!")
    print("--------------------------------------------------")

if __name__ == "__main__":
    clear_all_tables()
