# OrcaCloud – Onboarding Dashboard

Enterprise-grade cloud onboarding experience for the OrcaCloud platform.

---

## Features

| Section | Description |
|---|---|
| **Welcome Hero** | Personalised greeting, quick-action buttons, subtle grid backdrop |
| **Onboarding Checklist** | 6-step guided progress tracker with auto-detection and manual marking |
| **Cloud Overview Cards** | Real-time resource counts: Compute, Storage, Networking, Account |
| **Deploy Wizard** | 3-step server creation modal with image, flavor, and network pickers |
| **Docs & Support Panel** | Links to Getting Started, API Docs, CLI, Billing, Support |

---

## File Structure

```
frontend/src/
├── components/Cloud/
│   ├── WelcomeHero.tsx          # Hero section with quick actions
│   ├── OnboardingChecklist.tsx  # Step-by-step progress tracker
│   ├── CloudOverviewCards.tsx   # Resource overview cards
│   ├── DeployWizardModal.tsx    # 3-step server deploy wizard
│   └── DocsSupportPanel.tsx    # Documentation & support links
├── pages/
│   └── OnboardingDashboard.tsx  # Main page composing all sections
├── services/
│   └── cloudApi.ts              # Axios client for all cloud/onboarding endpoints
└── types/
    └── cloud.ts                 # TypeScript interfaces for all cloud types

backend/services/
├── onboarding_models.py         # OnboardingProgress model (UUID pk, 6 boolean steps)
├── onboarding_serializers.py    # DRF serializer with computed fields
└── onboarding_views.py          # 4 API views
    ├── onboarding_checklist      GET  /api/onboarding/checklist/
    ├── onboarding_checklist_update PATCH /api/onboarding/checklist/update/
    ├── dashboard_stats           GET  /api/onboarding/stats/
    └── wizard_options            GET  /api/onboarding/wizard-options/
```

---

## Backend API Endpoints

All endpoints require `Authorization: Token <token>` header.

### `GET /api/onboarding/checklist/`
Returns (or auto-creates) the current user's onboarding progress.

Auto-detects:
- `verify_email` — if user is active
- `create_vm` — if any `Instance` records exist for the user
- `attach_volume` — if any `StorageVolume` with `status=in-use` exists
- `configure_network` — if any `VPC` exists for the user

**Response:**
```json
{
  "id": "uuid",
  "verify_email": true,
  "add_ssh_key": false,
  "create_vm": false,
  "configure_network": false,
  "attach_volume": false,
  "explore_dashboard": false,
  "completion_pct": 17,
  "completed_steps": ["verify_email"],
  "updated_at": "2026-02-21T12:00:00Z"
}
```

### `PATCH /api/onboarding/checklist/update/`
Mark one or more steps as complete.

```json
{ "add_ssh_key": true, "explore_dashboard": true }
```

### `GET /api/onboarding/stats/`
Returns aggregated cloud resource counts for the overview cards.

```json
{
  "compute":    { "total_vms": 3, "running": 2, "stopped": 1 },
  "storage":    { "total_volumes": 4, "attached": 3, "detached": 1 },
  "networking": { "vpcs": 2, "security_groups": 5 },
  "account":    { "username": "samuel", "role": "Owner", "billing_status": "Active", "completion_pct": 67 }
}
```

### `GET /api/onboarding/wizard-options/`
Returns images, flavors, and networks for the deploy wizard dropdowns.
Falls back to seeded static data in the frontend if backend has no records.

---

## Navigation

The dashboard is accessible at:

- **URL**: `/dashboard`
- **Nav bar**: "Dashboard" link added to the primary navigation
- **User menu**: "Dashboard" item in the avatar dropdown

---

## Design System

| Token | Value |
|---|---|
| Dark background | `#0b1220` |
| Accent teal | `#14b8a6` |
| Text light | `#e6eef7` |
| Text muted | `#9ca3af` |
| Border subtle | `rgba(255,255,255,.07)` |
| Teal border | `rgba(20,184,166,.25)` |

Components use MUI v7 (`@mui/material ^7`). All Grid usage uses the v7 `size` prop (no `item` prop).

---

## Running Locally

### Backend
```bash
cd backend
source venv/bin/activate
python manage.py migrate
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm start
```

Visit `http://localhost:3000/dashboard`

---

## Deploy Wizard – Fallback Data

If the backend has no seeded `Image` or `Flavor` records, the wizard falls back to hardcoded entries:

| Name | vCPU | RAM | Disk | Price |
|---|---|---|---|---|
| Starter | 1 | 1 GB | 25 GB | $0.0075/hr |
| Standard | 2 | 4 GB | 80 GB | $0.0280/hr |
| Performance | 4 | 8 GB | 160 GB | $0.0550/hr |
| GPU Compute | 8 | 32 GB | 400 GB | $0.4900/hr |

To seed real data, use the Django admin at `/admin/` or the management CLI.
