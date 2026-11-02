# CoreEnterprise Boilerplate (.NET 10 + React Mantine v7 + PostgreSQL)

Enterprise Web Application Boilerplate based on [PRD v1.4.0](./prd.md) featuring:
- **2-Axis Authorization (RBAC + ABAC):** Vertical Job Level hierarchy (`STAFF` Rank 10 to `MD` Rank 60) separated from Horizontal System Roles (`EMPLOYEE`, `AUDITOR`, `SERVICEDESK`, `MASTER_DATA`, `SUPERADMIN`).
- **Contextual DoA Matrix (Header-Detail + Official SK PDF in DMS):** Plafond limits per `DocumentTypeCode` (`PO` vs `DCP`) and `JobLevel`, backed by mandatory official SK PDF attachments.
- **3-Axis Approver Resolution Engine:** Dynamic `UserId` resolution combining **Axis 1** (Job Level & Plafond), **Axis 2** (`OrganizationUnits` Tree Traversal), and **Axis 3** (`ApprovalAuthorityAssignments` by Document & SubCategory such as `ASSET` vs `AGRO_CHEM`), complete with Initiator Rank Auto-Skip (SoD), Pre-Submit Dry-Run Validation, and Revision Cycle Recalculation.
- **100% Dev-Prod PostgreSQL Parity:** Powered by `Npgsql.EntityFrameworkCore.PostgreSQL` with `jsonb` Audit Trail (`SaveChangesInterceptor`).

## Quick Start

### Option A: One-Click Batch Scripts (Windows)
- **Start All Services (PostgreSQL + Backend API + Frontend):**
  ```bat
  .\start.bat
  ```
- **Stop All Services & Release Ports (`5080`, `5173`, `5433`):**
  ```bat
  .\stop.bat
  ```

### Option B: Manual Commands

#### 1. Start Local PostgreSQL (Docker on Port 5433)
```bash
docker compose up -d
```

### 2. Run Backend API (.NET 10)
```bash
dotnet run --project backend/src/CoreEnterprise.WebApi
```
The API listens on `http://localhost:5080` and automatically applies schema creation and seeds the initial Organization Tree, 2-Axis Roles/JobLevels, DoA Policy Matrix (`SK-DIR/2026/XI/004`), and Approver Assignments (`User01`..`User04`).

### 3. Run Frontend (React + Vite + Mantine v7)
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173`.

