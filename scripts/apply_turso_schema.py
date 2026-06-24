#!/usr/bin/env python3
"""Apply Prisma-generated SQL to Turso via libSQL HTTP API."""
import json
import urllib.request
import urllib.error

DB_URL = "https://mision-db-shadowwolfsubs.aws-us-east-1.turso.io"
TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3ODIyNzQzMDUsImlkIjoiMDE5ZWY3ZDMtN2UwMS03YjAzLWE3NzgtZDE2NzhjOWRjZDdmIiwicmlkIjoiODI4MTczZjEtZTBlMC00NzczLThhZDAtOTM0OWIwZDY3Y2ZmIn0.K05t9-9QY-ITEjEPUM1nC19SfRqW-pkKpomZ8XATZX82pby9UVWIU6C_O3YrIw_QnDBPMYXUOmaWkSKlTCtFAw"

with open("/tmp/migration.sql", "r") as f:
    sql_content = f.read()

# Strip comment-only lines first, then split by semicolon
lines = [l for l in sql_content.split("\n") if not l.strip().startswith("--")]
clean_sql = "\n".join(lines)
statements = []
for stmt in clean_sql.split(";"):
    stmt = stmt.strip()
    if stmt:
        statements.append(stmt)

print(f"Found {len(statements)} SQL statements to apply")

url = f"{DB_URL}/v2/pipeline"
headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json",
}

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
            if "results" in data and data["results"][0].get("type") == "ok":
                success += 1
                preview = stmt[:60].replace("\n", " ")
                print(f"  [{i}/{len(statements)}] OK: {preview}...")
            else:
                failed += 1
                print(f"  [{i}/{len(statements)}] UNEXPECTED: {data}")
    except urllib.error.HTTPError as e:
        failed += 1
        err_body = e.read().decode("utf-8", errors="replace")[:300]
        print(f"  [{i}/{len(statements)}] HTTP {e.code}: {err_body}")
    except Exception as e:
        failed += 1
        print(f"  [{i}/{len(statements)}] ERROR: {e}")

print(f"\nSuccess: {success}/{len(statements)}, Failed: {failed}/{len(statements)}")
