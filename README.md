# Evolux

Dashboard personal de finanzas y productividad con Supabase, React 19 y Vite.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + Vite 7 (JSX) |
| Estilos | TailwindCSS 3 + CSS custom properties |
| Backend | Supabase (Postgres + Auth + RLS) |
| Estado | React Context |
| Routing | react-router-dom v6 |
| Formularios | react-hook-form + Zod |
| Animaciones | Framer Motion |
| Gráficos | Recharts |
| Notificaciones | Sonner |

## Setup

```bash
npm install
cp .env.example .env   # editar credenciales de Supabase
npm run dev             # http://localhost:5173
```

### Variables de entorno (`.env`)

| Variable | Descripción |
|----------|-------------|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clave pública (anon key) de Supabase |
| `VITE_APPS_SCRIPT_URL` | URL de Google Apps Script (legacy) |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID |

### Base de datos

Ejecutar `sql/supabase_schema.sql` en el editor SQL de Supabase para crear tablas, índices, políticas RLS y triggers.

## Funcionalidades

### Dashboard (Home) — Analítica e Historial Central
- **Ingresos vs Gastos vs Ahorro** — gráfico de barras multi-columna (3M, 6M, 1A) con desglose de Ingresos, Gastos Fijos, Gastos Variables y Ahorro
- **Gastos del mes** — gráfico circular (Donut) de gastos fijos y variables (pagados vs pendientes)
- **Ahorro Acumulado** — gráfico de área con progresión histórica de CDT y Colchón de emergencia
- **Productividad** — seguimiento de Tareas por Espacio y progreso de Hábitos mensuales
- **Metas Financieras** — barra de progreso de metas activas
- **Historial de Meses Registrados** — lista cronológica de presupuestos guardados

### Finanzas (Finance)
Dividido en 2 módulos operacionales:
1. **Ingresos y Gastos** (`IncomeExpensesTab.jsx`):
   - **Ingresos Fijos**: conversión Wise EUR/USD → COP o ingreso manual
   - **Gastos Anuales**: gastos recurrentes anuales
   - **Gastos Fijos Mensuales & Gastos Variables Mensuales**: edición con ordenación de filas (arriba/abajo)
   - **Modales de Confirmación**: ventanas emergentes explicativas al ejecutar *"Copiar mes anterior"* o *"Limpiar"* por sección
2. **Liquidez** (`LiquidityTab.jsx`):
   - Cuentas de dinero actual, ingresos pendientes y deudas

### Metas (Goals)
- Crear metas de ahorro con nombre, monto objetivo y monto inicial
- Agregar/restar dinero con historial de transacciones
- Barra de progreso visual con color personalizable

### Hábitos (Fitness)
- Tracking mensual de hábitos con grid de 30 días
- Frecuencia configurable (diario/semanal/mensual)
- Stats: Mejor Racha, Hábito Top, Menor Racha
- Gráfico de líneas de progreso mensual

### Tareas (Tasks)
- Organización por espacios y columnas tipo Kanban
- Columnas default: Por Hacer, En Progreso, Terminado
- Checklist de subtareas por tarea
- Fecha límite y categorización

### Perfil (Profile)
- Nombre, email y plan
- Toggle de integración Wise (EUR/USD)
- Toggle dark/light mode
- Configuración general y notificaciones

## Arquitectura

```
src/
├── features/           # Features autónomas
│   ├── finance/        #   components (IncomeExpensesTab, LiquidityTab), context, hooks, services
│   ├── tasks/          #   components, context, hooks, services
│   ├── goals/          #   components, hooks, services
│   ├── fitness/        #   components, hooks, services
│   ├── auth/           #   components, context, hooks, services
│   ├── monthlyTracker/ #   context, services
│   ├── profile/        #   components, hooks
│   └── dashboard/      #   components, hooks
├── shared/             # Código compartido entre features
│   ├── components/     #   StatCard, DatePicker, CalendarInput, ConfirmDialog, etc.
│   ├── services/       #   supabase.js (cliente), api.js (Google Apps Script)
│   └── lib/            #   constants.js, validation.js
├── context/            # Contextos app-wide (Theme, User)
├── layout/             # MainLayout + Sidebar
├── hooks/              # useAuth (re-export)
├── App.jsx
├── main.jsx
└── index.css
```

## Comandos

```bash
npm run dev       # servidor de desarrollo
npm run build     # build de producción → dist/
npm run lint      # ESLint
npm run preview   # previsualizar build
```

## Auth

- Email/password + Google OAuth vía Supabase Auth
- Perfil auto-creado al registrarse (trigger SQL + fallback en `AuthContext`)
- Timeout de 10s en inicialización de auth
- RLS en todas las tablas: `auth.uid() = user_id`
