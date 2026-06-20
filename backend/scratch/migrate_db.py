import sys
import os
import sqlite3
from sqlalchemy import create_engine, inspect

# Add backend directory to path to import models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import DATABASE_URL
import models
from database import Base, engine

def migrate():
    print(f"Database URL: {DATABASE_URL}")
    db_path = DATABASE_URL.replace("sqlite:///", "")
    print(f"SQLite DB Path: {db_path}")
    
    if not os.path.exists(db_path):
        print("Database file does not exist, running metadata create_all...")
        Base.metadata.create_all(bind=engine)
        print("Done!")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Iterate through all tables defined in models
    for table_name, table in Base.metadata.tables.items():
        print(f"Checking table: {table_name}")
        
        # Get existing columns in SQLite
        cursor.execute(f"PRAGMA table_info({table_name})")
        existing_cols = {row[1]: row[2] for row in cursor.fetchall()}
        
        if not existing_cols:
            print(f"Table {table_name} does not exist in database, creating it...")
            table.create(bind=engine)
            continue
            
        # Check for missing columns
        for column in table.columns:
            col_name = column.name
            if col_name not in existing_cols:
                # Map SQLAlchemy type to SQLite type
                sa_type = str(column.type).upper()
                if "FLOAT" in sa_type:
                    sql_type = "REAL"
                elif "INTEGER" in sa_type:
                    sql_type = "INTEGER"
                elif "BOOLEAN" in sa_type:
                    sql_type = "BOOLEAN"
                elif "JSON" in sa_type:
                    sql_type = "JSON"
                elif "TEXT" in sa_type:
                    sql_type = "TEXT"
                else:
                    sql_type = "TEXT"
                
                alter_query = f"ALTER TABLE {table_name} ADD COLUMN {col_name} {sql_type}"
                print(f"Adding column: {col_name} to {table_name} | Query: {alter_query}")
                try:
                    cursor.execute(alter_query)
                    conn.commit()
                except Exception as e:
                    print(f"Error altering table {table_name}: {e}")
                    
    conn.close()
    print("Migration check completed successfully!")

if __name__ == "__main__":
    migrate()
