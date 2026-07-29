#!/usr/bin/env python3
"""Desencriptar BD completa — versión simplificada que sí funciona"""
import subprocess, json, re, time

ANON_KEY = "sb_publishable_6vRIpL85wKXSvaEK-vui3w_uRl8nYK-"
FUNC = "https://tjbluywadxsbyqtxviyt.supabase.co/functions/v1/finance-crypto"
CWD = "/Users/davidduarte/Documents/Projects/Evolux"

def qry(sql):
    r = subprocess.run(["supabase","db","query","--linked",sql], capture_output=True, text=True, cwd=CWD)
    return r.stdout

def decrypt(val, typ="string"):
    p = json.dumps({"action":"decrypt","value":val,"expectedType":typ})
    r = subprocess.run(["curl","-s","-X","POST",FUNC,
        "-H",f"Authorization: Bearer {ANON_KEY}",
        "-H","Content-Type: application/json","-d",p],
        capture_output=True, text=True, timeout=30)
    try: return json.loads(r.stdout).get("value", val)
    except: return val

def esc(v, t):
    if t == "number":
        try: return str(float(v))
        except: return "0"
    return f"'{v.replace(chr(39), chr(39)+chr(39))}'"

# Tablas -> [(campo, tipo)]
TAB = [
    ("monthly_budgets", [("salary_eur","n"),("wise_fee_eur","n"),("exchange_rate","n"),("manual_income_cop","n"),
                         ("usd_amount","n"),("usd_rate","n"),("usd_fee","n"),("usd_cop","n")]),
    ("monthly_fixed_expenses", [("label","s"),("amount","n")]),
    ("monthly_variable_expenses", [("label","s"),("amount","n")]),
    ("monthly_incomes", [("label","s"),("amount","n"),("fee","n"),("rate","n")]),
    ("wise_deposits", [("amount_eur","n")]),
]
NUM = {"n"}

ok = 0
for tn, fields in TAB:
    fn = ["id"] + [f[0] for f in fields]
    cols = ", ".join(f"'{f}'::text,\"{f}\"::text" for f in fn)
    out = qry(f"SELECT json_agg(json_build_object({cols})::text) FROM \"{tn}\";")
    m = re.search(r'(\[.*\])', out, re.DOTALL)
    if not m: continue
    raw = re.sub(r'}(\s*){', r'},\1{', m.group(1))
    try: rows = json.loads(raw)
    except: continue
    for item in rows:
        r = json.loads(item) if isinstance(item, str) else item
        rid = r.get("id","")
        if not rid: continue
        sets = []
        for fn, ft in fields:
            enc = r.get(fn, "")
            if not isinstance(enc, str) or len(enc) < 10: continue
            if '"iv"' not in enc: continue
            dec = decrypt(enc, "number" if ft in NUM else "string")
            if dec and dec != enc:
                sets.append(f"\"{fn}\"={esc(dec, 'number' if ft in NUM else 'string')}")
        if sets:
            sql = f"UPDATE \"{tn}\" SET {', '.join(sets)} WHERE id='{rid}';"
            o = qry(sql)
            if "ERROR" not in o.upper():
                print(f"  ✔ {rid[:12]} → {len(sets)} campos ({tn})")
                ok += 1
            else:
                print(f"  ❌ {rid[:12]} → ERROR: {o[:100]}")
        else:
            print(f"  • {rid[:12]} → sin cambios ({tn})")
        time.sleep(0.02)

print(f"\n✅ {ok} filas actualizadas")
