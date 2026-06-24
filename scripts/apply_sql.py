#!/usr/bin/env python3
"""Apply SQL to Turso DB. Usage: python3 apply_sql.py <sql_file>"""
import json
import sys
import urllib.request
import urllib.error

DB_URL = "https://mision-db-shadowwolfsubs.aws-us-east-1.turso.io"
TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3ODIyNzQzMDUsImlkIjoiMDE5ZWY3ZDMtN2UwMS03YjAzLWE3NzgtZDE2NzhjOWRjZDdmIiwicmlkIjoiODI4MTczZjEtZTBlMC00NzczLThhZDAtOTM0OWIwZDY3Y2ZmIn0.K05t9-9QY-ITEjEPUM1nC19SfRqW-pkKpomZ8XATZX82pby9UVWIU6C_O3YrIw_QnDBPMYXUOmaWkSKlTCtFAw"

sql_file = sys.argv[1] if len(sys.argv) > 1 else "/home/z/my-project/migration_ai.sql"

with open(sql_file, "r") as f:
    sql_content = f.read()

lines = [l for l in sql_content.split("\n") if not l.strip().startswith("--")]
clean_sql = "\n".join(lines)
statements = [s.strip() for s in clean_sql.split(";") if s.strip()]

print(f"Found {len(statements)} SQL statements to apply")

url = f"{DB_URL}/v2/pipeline"
headers = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

success = 0
failed = 0
for i, stmt in enumerate(statements, 1):
    body = json.dumps({
        "requests": [
            {"type": "execute", "stmt": {"sql": stmt}},
            {"type": "close"}
        ]
    }).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
            if data.get("results") and data["results"][0].get("type") == "ok":
                success += 1
                preview = stmt[:70].replace("\n", " ")
                print(f"  [{i}/{len(statements)}] OK: {preview}...")
            else:
                failed += 1
                print(f"  [{i}/{len(statements)}] UNEXPECTED: {json.dumps(data)[:200]}")
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")[:300]
        if "already exists" in err_body:
            print(f"  [{i}/{len(statements)}] SKIP (already exists): {stmt[:50]}...")
            success += 1
        else:
            failed += 1
            print(f"  [{i}/{len(statements)}] HTTP {e.code}: {err_body}")
    except Exception as e:
        failed += 1
        print(f"  [{i}/{len(statements)}] ERROR: {e}")

print(f"\nSuccess: {success}/{len(statements)}, Failed: {failed}/{len(statements)}")
