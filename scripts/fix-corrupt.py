#!/usr/bin/env python3
"""
Fix wallet_items, transactions, goals, goal_history corrupt values.
Lee cada valor corrupto, lo desencripta vía Edge Function, y lo actualiza.
"""
import subprocess, json, re, time, sys

ANON_KEY = "sb_publishable_6vRIpL85wKXSvaEK-vui3w_uRl8nYK-"
FUNC_URL = "https://tjbluywadxsbyqtxviyt.supabase.co/functions/v1/finance-crypto"
CWD = "/Users/davidduarte/Documents/Projects/Evolux"

def run(sql):
    r = subprocess.run(["supabase","db","query","--linked",sql],
        capture_output=True, text=True, cwd=CWD)
    return r.stdout

def get_val(val):
    """Check if value needs decryption. Returns (is_encrypted, decrypted_or_None)."""
    if not isinstance(val, str) or len(val) < 10: return False, None
    if '"iv"' in val or '"value"' in val[:20]:
        return True, None  # needs decryption
    return False, None

def decrypt_via_edge(val):
    """Call Edge Function to decrypt a value."""
    payload = json.dumps({"action":"decrypt","value":val,"expectedType":
        "number" if any(c.isdigit() for c in val[:5]) else "string"})
    try:
        r = subprocess.run(["curl","-s","-X","POST",FUNC_URL,
            "-H",f"Authorization: Bearer {ANON_KEY}",
            "-H","Content-Type: application/json",
            "-d",payload], capture_output=True, text=True, timeout=30)
        data = json.loads(r.stdout)
        if "error" not in data and "value" in data:
            return data["value"]
        print(f"      ⚠️  Edge error: {data}")
        return None
    except Exception as e:
        print(f"      ⚠️  Exception: {e}")
        return None

def esc(val, is_num):
    if is_num:
        try: return str(float(val.replace(",",".")))
        except: return "'"+val.replace("'","''")+"'"
    else:
        return "'"+str(val).replace("'","''")+"'"

def is_encrypted(val):
    if not isinstance(val, str) or len(val) < 10: return False
    # The corrupt format stores escaped quotes: {\"iv\":\"...\",\"cipherText\":\"...\"}
    if '\\"iv\\"' in val and '\\"cipherText\\"' in val: return True
    if '\\"iv\\"' in val: return True
    if '"iv"' in val and '"cipherText"' in val: return True
    return False

# Tables to fix: name -> [(field, is_numeric)]
FIX = [
    ("wallet_items", [("name", False), ("value", True)]),
    ("transactions", [("name", False), ("amount", True), ("category", False)]),
    ("goals", [("title", False), ("target", True), ("current", True)]),
    ("goal_history", [("amount", True), ("note", False)]),
]

total = 0
for (table, fields) in FIX:
    print(f"\n━━━ {table}")
    all_cols = ["id"] + [f[0] for f in fields]
    cols = ", ".join(f"'{f}'::text, \"{f}\"::text" for f in all_cols)
    out = run(f"SELECT json_agg(json_build_object({cols})::text) FROM \"{table}\";")
    m = re.search(r'(\[.*\])', out, re.DOTALL)
    if not m:
        print("   No data")
        continue
    raw = re.sub(r'}(\s*){', r'},\1{', m.group(1))
    try: rows = json.loads(raw)
    except:
        print("   Parse error")
        continue
    rows = [json.loads(r) if isinstance(r, str) else r for r in rows]
    print(f"   {len(rows)} rows read")

    for row in rows:
        rid = row.get("id","")
        if not rid: continue
        sets = []
        for fn, is_num in fields:
            val = row.get(fn)
            if is_encrypted(val):
                dec = decrypt_via_edge(val)
                if dec is not None:
                    sets.append(f"\"{fn}\"={esc(dec, is_num)}")
        if sets:
            sql = f"UPDATE \"{table}\" SET {', '.join(sets)} WHERE id='{rid}';"
            o = run(sql)
            if "ERROR" not in o.upper():
                print(f"   ✔ {rid[:12]} → {len(sets)} campos")
                total += 1
            else:
                print(f"   ❌ {rid[:12]} → ERROR: {o[:100]}")
        time.sleep(0.05)

print(f"\n✅ {total} filas actualizadas")
