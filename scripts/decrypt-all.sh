#!/bin/bash
# DESENCRIPTAR TODA LA BD
# ⚠️ Almacena datos financieros como texto plano — ejecutar bajo tu responsabilidad.
# Para revertir: correr node scripts/encrypt-all.mjs (se creará después)
set -e

ANON_KEY=$(grep VITE_SUPABASE_PUBLISHABLE_KEY .env | cut -d '=' -f2)
PROJECT="tjbluywadxsbyqtxviyt"
SUPABASE_URL="https://$PROJECT.supabase.co"
FUNCTIONS_URL="$SUPABASE_URL/functions/v1/finance-crypto"

echo "🔓 Desencriptando BD..."
echo ""

# Función: desencriptar un valor llamando a la Edge Function
decrypt() {
  local value="$1"
  local expected_type="${2:-string}"
  if [[ "$value" != *'"iv"'* ]]; then
    echo "$value"
    return
  fi
  curl -s -X POST "$FUNCTIONS_URL" \
    -H "Authorization: Bearer $ANON_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"action\":\"decrypt\",\"value\":$(echo "$value" | jq -Rs '.'),\"expectedType\":\"$expected_type\"}" | jq -r '.value'
}

# Tablas a procesar
TABLES=(
  "monthly_budgets:salary_eur:number,wise_fee_eur:number,exchange_rate:number,manual_income_cop:number,usd_amount:number,usd_rate:number,usd_fee:number,usd_cop:number"
  "monthly_fixed_expenses:label:string,amount:number"
  "monthly_variable_expenses:label:string,amount:number"
  "monthly_incomes:label:string,amount:number,fee:number,rate:number"
  "accounts:name:string,amount:number"
  "transactions:name:string,amount:number,category:string"
  "wallet_items:name:string,value:number"
  "goals:title:string,target:number,current:number"
  "goal_history:amount:number,note:string"
  "wise_deposits:amount_eur:number"
)

for entry in "${TABLES[@]}"; do
  table="${entry%%:*}"
  fields="${entry#*:}"
  echo "━━━ $table ━━━"
  
  # Obtener todas las filas como JSON
  ROWS=$(supabase db query --linked "SELECT row_to_json(t) FROM (SELECT * FROM \"$table\") t;" -t 2>/dev/null || echo "")
  if [ -z "$ROWS" ]; then
    echo "   (sin datos o no existe)"
    continue
  fi

  while IFS= read -r row_json; do
    [ -z "$row_json" ] && continue
    row_id=$(echo "$row_json" | jq -r '.id // empty')
    [ -z "$row_id" ] && continue

    updates=""
    IFS=',' read -ra FIELD_LIST <<< "$fields"
    for field_entry in "${FIELD_LIST[@]}"; do
      field_name="${field_entry%%:*}"
      field_type="${field_entry#*:}"
      encrypted=$(echo "$row_json" | jq -r ".${field_name} // empty" 2>/dev/null)
      if [ -n "$encrypted" ] && [ "$encrypted" != "null" ]; then
        decrypted=$(decrypt "$encrypted" "$field_type")
        # Escapar para SQL
        if [ "$field_type" = "number" ]; then
          updates+="${field_name}=${decrypted},"
        else
          escaped=$(echo "$decrypted" | sed "s/'/''/g")
          updates+="${field_name}='${escaped}',"
        fi
      fi
    done

    if [ -n "$updates" ]; then
      updates="${updates%,}"
      supabase db query --linked "UPDATE \"$table\" SET $updates WHERE id='$row_id';" 2>/dev/null
      echo "   ✔ $row_id"
    fi
  done <<< "$ROWS"
  echo ""
done

echo "✅ Desencriptación completada."
echo "⚠️ Los datos ahora están en texto plano en la BD."
echo "Para re-encriptar, ejecutá: node scripts/reencrypt-all.mjs"
