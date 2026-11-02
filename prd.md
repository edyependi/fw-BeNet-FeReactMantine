# Product Requirements Document (PRD): Enterprise Web Application Boilerplate

| Informasi Dokumen | Detail |
| :--- | :--- |
| **Nama Proyek** | CoreEnterprise Boilerplate (.NET + React Mantine) |
| **Versi Dokumen** | 1.4.0 (Updated: Full PostgreSQL Parity, SoD Auto-Skip, Plt/Multi-Position, Pre-Submit Dry-Run, & Re-submit Recalculation) |
| **Status** | Ready for Development |
| **Tanggal Pembaruan** | 1 November 2026 |
| **Tech Stack Utama** | .NET 8/9/10 (C#), React.js (TypeScript) + Mantine UI v7, PostgreSQL |

---

## 1. Ringkasan Eksekutif (Executive Summary)

Proyek ini bertujuan untuk membangun *boilerplate* (kerangka dasar) aplikasi web kelas *enterprise* yang modular, aman, dan siap pakai (*production-ready*). *Boilerplate* ini dirancang agar tim pengembang dapat langsung fokus pada logika bisnis spesifik tanpa harus membangun ulang fitur-fitur fondasi seperti:

1. **Keamanan & Otorisasi 2 Dimensi (2-Axis Authorization):** Memisahkan secara tegas antara Hirarki Jabatan Struktural (*Job Level* untuk alur kerja/plafond) dan Peran Fungsional/Teknis (*System Role* untuk hak akses fitur/CRUD).
2. **Proses Bisnis, Tata Kelola & Resolusi Approver 3 Dimensi (Workflow, Contextual DoA Matrix, & 3-Axis Approver Resolution):**
   * Mesin persetujuan dinamis berbasis struktur **Header-Detail** yang mendukung batas nilai persetujuan (*plafond*) berbeda untuk setiap jenis dokumen (misal: PO vs DCP) dan mewajibkan lampiran dokumen resmi (SK Direksi) melalui modul DMS sebagai acuan *compliance*.
   * Pemisahan antara aturan plafond jabatan dengan penugasan individu (`UserId`) melalui mekanisme **3-Axis Approver Resolution** (Jabatan & Plafond + Pohon Organisasi Berjenjang Department/Area + Kategori Subjek/Domain seperti *Asset* vs *Agro Chemical*).
3. **Pengalaman Pengguna & Komunikasi:** *Theming* (Light/Dark), *Real-time Notification* (In-App & Email), dan *Multi-language* (i18n ID/EN).
4. **Keamanan Data & Analitik:** *Audit Trail* otomatis pada level perubahan kolom (*Old Value* vs *New Value*), *Reporting & Export Engine*, dan *Document Management System* (DMS).

Sistem dirancang dengan pendekatan **100% Dev-Prod Database Parity** menggunakan **PostgreSQL** (`Npgsql.EntityFrameworkCore.PostgreSQL`) sejak pengembangan lokal hingga lingkungan *staging* dan *production*. Pendekatan ini menjamin konsistensi perilaku transaksi, presisi komparasi tipe data finansial (`numeric(18,2)`), pemanfaatan kolom `jsonb` berindeks untuk *Audit Trail*, serta keandalan *concurrency* untuk *Background Jobs*.

---

## 2. Arsitektur & Spesifikasi Teknis (Tech Stack)

### 2.1. Backend (.NET Ecosystem)
* **Framework:** ASP.NET Core Web API (.NET 8 / .NET 9 / .NET 10)
* **Arsitektur:** Clean Architecture / Modular Monolith (`Domain`, `Application`, `Infrastructure`, `WebApi`)
* **Pola Desain:** CQRS (menggunakan MediatR), Repository & Unit of Work Pattern (di atas EF Core)
* **ORM:** Entity Framework Core (EF Core) dengan *Code-First Migrations* dan `SaveChangesInterceptor` (untuk Audit Trail otomatis)
* **Real-time Communication:** ASP.NET Core SignalR (untuk notifikasi langsung ke lonceng UI dan pembaruan status *inbox workflow*)
* **Background Jobs:** Hangfire atau Quartz.NET (untuk antrean email, pengingat SLA *workflow*, *cut-over* otomatis versi kebijakan DoA, dan *auto-escalation*)
* **Validasi & Mapping:** FluentValidation, Mapster
* **Logging:** Serilog (terintegrasi dengan *sink* File, Console, dan Database)

### 2.2. Frontend (React Ecosystem)
* **Framework:** React.js (Vite + TypeScript)
* **UI Component Library:** Mantine UI (v7.x) — mencakup `@mantine/core`, `@mantine/hooks`, `@mantine/form` (mendukung *nested array* Header-Detail), `@mantine/dates`, `@mantine/dropzone`, `@mantine/notifications`, `@mantine/charts`, dan `mantine-react-table` (v2.x yang dikunci kompatibel penuh dengan `@mantine/core` v7.x untuk mencegah konflik *peer dependency*).
* **State Management:** Zustand (Client State: Auth, Theme, Active Role/Org) & TanStack Query / React Query v5 (Server State, Caching, & Optimistic Updates)
* **Routing:** React Router v6+ (dilengkapi *Protected Route Guards* berbasis *Permission* dan *Job Rank*)
* **Internationalization:** `react-i18next` (Bahasa Indonesia & Bahasa Inggris)
* **HTTP Client:** Axios (dilengkapi *interceptors* untuk *Refresh Token* otomatis dan *Accept-Language Header*)

### 2.3. Database & Strategi Infrastruktur (Full PostgreSQL Dev-Prod Parity)
* **Database Engine Utama (Local Dev, Staging, & Production):** **PostgreSQL** menggunakan provider `Npgsql.EntityFrameworkCore.PostgreSQL`.
* **Keunggulan Arsitektur Single-Engine PostgreSQL:**
  * **100% Dev-Prod Parity:** Menghilangkan perbedaan perilaku query LINQ antara lingkungan lokal dan *staging/production*.
  * **Tipe Data Presisi & Native JSON:** Penggunaan tipe `Uuid` (`Guid`) untuk PK, `numeric(18,2)` asli untuk komparasi nilai uang/plafond DoA yang akurat, `timestamptz` (UTC) untuk masa berlaku SK DoA, serta tipe `jsonb` berindeks untuk kolom `OldValuesJson`, `NewValuesJson`, dan `AffectedColumnsJson` pada `AuditLogs`.
  * **Pencarian & Performa:** Mendukung pencarian *case-insensitive* (`ILIKE`) pada tabel analitik serta penyimpanan *Background Jobs* (`Hangfire.PostgreSql`) di dalam instance database yang sama tanpa risiko *file-locking*.
  * **Single Migration Assembly:** Seluruh migrasi skema dikelola secara terpusat di dalam *project* `Infrastructure` (dilengkapi `docker-compose.yml` untuk menyalakan PostgreSQL lokal secara instan bila belum terinstal di mesin *host*).

---

## 3. Spesifikasi Fungsional per Modul

### 3.1. Modul Keamanan & Akses (Security & 2-Axis Authorization)

#### A. Autentikasi & Profil Pengguna (User Profile)
* **Autentikasi:** JWT (*Access Token* berumur pendek 15-30 menit + *Refresh Token* di *HttpOnly Cookie* dengan mekanisme *Token Rotation* dan deteksi *reuse*).
* **Manajemen Profil & Foto:**
  * Pengguna dapat memperbarui informasi pribadi, kata sandi, tanda tangan digital/paraf (untuk cap *approval* dokumen), serta mengunggah foto profil.
  * Pemrosesan gambar di sisi klien (*crop/resize* rasio 1:1 menggunakan Mantine Modal) dan kompresi ke format `.webp` di sisi server sebelum disimpan ke DMS.

#### B. Arsitektur Otorisasi 2 Dimensi (2-Axis Authorization: RBAC + ABAC)
Untuk menghindari tumpang tindih antara jabatan struktural dan tugas teknis aplikasi, identitas akses pengguna dipisahkan menjadi **2 Sumbu Independen**:

| Dimensi | Nama Konsep | Nilai / Entitas | Fungsi Utama di Sistem |
| :--- | :--- | :--- | :--- |
| **Sumbu 1: Level Kerja** *(Vertikal / Hirarkis)* | **Job Level / Position Grade** *(Basis Workflow & DoA)* | 1. **Staff** (`Rank: 10`)<br>2. **Manager** (`Rank: 20`)<br>3. **Area Manager** (`Rank: 30`)<br>4. **General Manager / GM** (`Rank: 40`)<br>5. **Director** (`Rank: 50`)<br>6. **Managing Director / MD** (`Rank: 60`) | • Menentukan posisi pengguna dalam **hirarki persetujuan (Workflow)**.<br>• Menentukan **batas plafon finansial (DoA)**.<br>• Bersifat berurutan (*sequential rank*). Satu pengguna memiliki 1 jabatan utama pada unit organisasi tertentu. |
| **Sumbu 2: Level Teknis** *(Horizontal / Fungsional)* | **System / Functional Role** *(Murni RBAC)* | • **Employee / Standard User** *(Default)*<br>• **Auditor**<br>• **Servicedesk**<br>• **Team Master Data**<br>• **SuperAdmin** | • Menentukan **hak akses menu, fitur sistem, dan operasi CRUD**.<br>• Bersifat modular (relasi *Many-to-Many*). Contoh: Seorang *Staff* atau *Manager* dapat merangkap role sebagai *Team Master Data* atau *Auditor*. |

#### C. Struktur Klaim JWT (Token Payload) & Dukungan Multi-Position (Plt/Pjs)
Saat pengguna berhasil login, kedua dimensi otorisasi serta atribut organisasi utama disematkan ke dalam klaim JWT:
```json
{
  "sub": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "Edy Ependi",
  "job_level": "AM",
  "job_rank": 30,
  "org_unit_id": "ORG-AREA-SUM1",
  "org_unit_type": "AREA",
  "roles": ["EMPLOYEE", "MASTER_DATA"],
  "permissions": ["MasterData.Read", "MasterData.Write", "Workflow.Approve"]
}
```
> **Catatan Multi-Position / Pelaksana Tugas (Plt/Pjs):** Klaim `org_unit_id` dan `job_level` di dalam JWT merepresentasikan jabatan serta unit organisasi *primer* (`PrimaryOrgUnitId`) pengguna. Namun, dalam skenario di mana seorang pejabat merangkap jabatan sebagai **Plt./Pjs.** di unit organisasi lain (misal Manager `DEPT-AGRO` merangkap Plt. Manager `DEPT-MILL`), otorisasi eksekusi persetujuan (*Approve/Reject/Revise*) **tidak dibatasi secara statis oleh klaim `org_unit_id` pada JWT**, melainkan divalidasi secara dinamis di sisi server terhadap `WorkflowSteps.AssignedUserId`, penugasan aktif di `ApprovalAuthorityAssignments`, dan `ApprovalDelegations`.

---

### 3.2. Modul Proses Bisnis (Workflow, Contextual DoA Header-Detail, & 3-Axis Approver Resolution)

#### A. Contextual DoA Matrix Berbasis Header-Detail & Lampiran SK Resmi (DMS)
Batas kewenangan persetujuan (*plafond*) **tidak disimpan secara statis** pada tabel `JobLevels`, melainkan dikelola melalui struktur **Header-Detail** yang terikat pada jenis dokumen dan bukti dokumen kebijakan resmi:
1. **DoA Policy Header (`DoAPolicyHeaders`):**
   * Merepresentasikan dokumen Surat Keputusan (SK) Direksi atau Memo Kebijakan DoA yang memiliki Nomor SK, Judul, Masa Berlaku (`EffectiveFrom` s/d `EffectiveTo`), Nomor Versi, dan Status Siklus Hidup (`DRAFT`, `PENDING_APPROVAL`, `ACTIVE`, `SUPERSEDED`, `ARCHIVED`).
   * **Kewajiban Lampiran Resmi (DMS Integration):** Sebuah kebijakan DoA **wajib** memiliki lampiran file PDF resmi (misal: *Scan SK Direksi yang telah ditandatangani*) yang diunggah ke modul DMS (`OfficialAttachmentFileId`) sebelum statusnya dapat diaktifkan (`ACTIVE`).
   * **Versioning & Cut-over Otomatis:** Ketika revisi SK baru diaktifkan, kebijakan versi sebelumnya otomatis berubah menjadi `SUPERSEDED`. Transaksi yang sedang berjalan tetap mengacu pada versi SK saat dokumen di-*submit* demi konsistensi audit.
2. **DoA Policy Detail (`DoAPolicyDetails`):**
   * Menyimpan matriks batas nilai persetujuan (*plafond*) per kombinasi **Tipe Dokumen (`DocumentTypeCode`) + Level Jabatan (`JobLevelId`)**.
   * **Contoh Kasus Kontekstual:**
     * Dokumen **Purchase Order (`PO`)**: Level `Manager` memiliki plafond **Rp 50.000.000**, Level `Director` memiliki plafond **Rp 100.000.000**.
     * Dokumen **Direct Cash Payment (`DCP`)**: Level `Manager` memiliki plafond **Rp 75.000.000**, Level `Director` memiliki plafond **Rp 200.000.000**.

#### B. Pemisahan Aturan Plafond dari Individu: 3-Axis Approver Resolution
Sistem **melarang penanaman `UserId` secara langsung (*hardcoded*) di dalam tabel matriks plafond (`DoAPolicyDetails`)** agar mutasi atau pergantian personel tidak merusak SK DoA. Sebagai gantinya, penentuan siapa `UserId` yang menyetujui dokumen dilakukan secara dinamis oleh *Workflow Engine* melalui **3-Axis Approver Resolution**:

1. **Axis 1 — Jabatan & Plafond (`DoAPolicyDetails`):**
   Menentukan daftar *Job Level* yang harus dilalui berdasarkan jenis dokumen dan nilai uang (misal: membutuhkan `MGR` lalu `AM`).
2. **Axis 2 — Pohon Organisasi Berjenjang (`OrganizationUnits`):**
   Menentukan cakupan wilayah/unit kerja dokumen berdasarkan struktur pohon organisasi (*Self-Referencing Parent-Child*: `Company / HO` $\rightarrow$ `Regional` $\rightarrow$ `Area` $\rightarrow$ `Department` $\rightarrow$ `Section`).
   * Jika *Requester* (`User03` di *Dept. Agronomy* dan `User04` di *Dept. Mill*) mengajukan dokumen **DCP** dengan nilai di bawah plafond Manager (misal Rp 50 Juta), maka persetujuan jatuh ke Manager di **Department masing-masing** (*Approver berbeda*).
   * Jika nilai DCP melewati plafond Manager (misal Rp 120 Juta) sehingga membutuhkan persetujuan **Area Manager (`AM`)**, sistem melakukan *tree traversal* naik ke `ParentUnitId` (Level **Area**). Karena *Dept. Agronomy* dan *Dept. Mill* berada di bawah payung **Area yang sama**, maka pada tahap `AM` kedua dokumen tersebut bermuara ke **`UserId` Area Manager yang sama**.
3. **Axis 3 — Spesialisasi Subjek / Kategori Domain (`ApprovalAuthorityAssignments`):**
   Mengikat **`UserId`** pejabat ke kombinasi `JobLevel` + `OrgUnitId` + `DocTypeCode` + `SubCategoryCode`.
   * **Contoh Kasus Spesialisasi PO:** Untuk pengajuan `PO` di level `Manager`, sistem membaca atribut `SubCategoryCode` pada Header dokumen. Jika `PO` bertipe **`ASSET`**, rute diarahkan ke **`User01`** (Manager Asset/Teknik). Jika `PO` bertipe **`AGRO_CHEM`** (Agro Chemical), rute diarahkan ke **`User02`** (Manager Agronomy/Procurement).
   * **Aturan Deterministik `SubCategoryCode` di Level Header Transaksi:** Setiap dokumen transaksi yang memiliki spesialisasi rute (seperti `PO`) wajib menetapkan `SubCategoryCode` pada level **Header Transaksi** sehingga seluruh baris item (*line items*) di dalam satu nomor dokumen berada dalam domain persetujuan yang sama dan tidak mencampur sub-kategori yang memiliki *Approver* berbeda.

#### C. Algoritma Resolusi Approver (Hierarchy Traversal, SoD Auto-Skip, & Pre-Submit Dry-Run)
Untuk setiap tahapan (*step*) jabatan yang dihasilkan oleh matriks DoA, sistem menjalankan aturan resolusi dan pengamanan berikut:

1. **Auto-Skip by Initiator Rank & Segregation of Duties (SoD / 4-Eyes Principle):**
   * Tahapan persetujuan dengan `TargetJobLevel.RankOrder < Requester.JobLevel.RankOrder` otomatis dilewati (*auto-skipped*) karena berada di bawah jenjang jabatan pengaju.
   * Jika pada suatu step hasil resolusi menunjuk ke diri pengaju sendiri (`AssignedUserId == RequesterUserId`), tetapi plafond pada jenjang tersebut belum mencukupi nilai transaksi (atau kebijakan dokumen mewajibkan prinsip *4-Eyes / persetujuan atasan*), maka pengaju tidak boleh menyetujui dokumennya sendiri (*Self-Approval Prevention*) dan sistem otomatis melakukan eskalasi ke `ParentUnitId` / jenjang jabatan berikutnya.
2. **Exact Match pada Unit Organisasi Saat Ini:** Cari di `ApprovalAuthorityAssignments` yang aktif dan cocok dengan `TargetJobLevel` + `CurrentOrgUnitId` + `DocTypeCode` + `SubCategoryCode` spesifik (misal: `PO` + `ASSET`).
3. **General Match pada Unit Organisasi Saat Ini:** Jika tidak ada pejabat khusus sub-kategori tersebut, cari yang memiliki `SubCategoryCode = "ALL"` pada `CurrentOrgUnitId` yang sama (misal: Manager Department umum untuk dokumen `DCP`).
4. **Parent Organization Escalation (Tree Traversal):** Jika pada level `Department` tidak terdapat jabatan yang dicari (misal sedang mencari `Area Manager` atau `Director`), sistem naik ke `ParentUnitId` (`Area` $\rightarrow$ `Regional` $\rightarrow$ `Head Office`) dan mengulangi langkah 2 dan 3 hingga menemukan `UserId` yang sah (dengan proteksi *cycle detection* untuk mencegah *infinite loop* pada pohon organisasi).
5. **Substitusi Delegasi Sementara (`ApprovalDelegations`):** Setelah `UserId` utama ditemukan (misal `User01`), sistem memeriksa apakah `User01` sedang memiliki jadwal delegasi aktif (cuti/dinas) pada tanggal tersebut. Jika ada, tugas dialihkan ke `DelegateeUserId` dengan mencatat atribusi *"On Behalf Of"* pada log persetujuan.
6. **Validasi Pre-Submit Dry-Run (Pencegahan *Dead-End* / `AssignedUserId = NULL`):**
   * Sistem **melarang** penyimpanan transaksi berstatus `IN_PROGRESS` yang memiliki tahapan `WorkflowSteps` dengan `AssignedUserId = NULL`.
   * Saat pengguna menekan tombol **Submit**, *Workflow Engine* wajib menjalankan *Dry-Run Resolution* untuk seluruh tahapan dari awal hingga *Final Approver*. Apabila terdapat satu saja tahapan jabatan yang gagal menemukan pejabat (`UserId`) hingga puncak pohon organisasi (`HO`), proses *Submit* dibatalkan (*rollback*) dan API mengembalikan pesan kesalahan yang spesifik (contoh: *"Gagal Submit: Pejabat untuk level Area Manager (AM) pada unit AREA-SUM1 untuk dokumen PO (Sub-Kategori: ASSET) belum ditetapkan di Matriks Penugasan Approver"*).

#### D. Aksi & Siklus Hidup Workflow (Termasuk Aturan Re-Submit setelah Revise)
* Setiap dokumen mendukung aksi: **Submit**, **Approve**, **Reject** (wajib alasan), **Revise / Send Back to Initiator** (kembalikan ke pembuat untuk revisi), dan **Cancel**.
* **Aturan Re-Calculation saat Re-Submit (Setelah `REVISED`):**
  * Ketika dokumen dikembalikan ke pembuat (`REVISED`), pembuat dapat memperbarui data transaksi (termasuk mengubah nilai uang `TransactionAmount` atau atribut dokumen) lalu menekan **Re-Submit**.
  * Saat **Re-Submit** dilakukan, *Workflow Engine* **wajib menghitung ulang (*re-calculate*) seluruh rute tahapan persetujuan dari awal** (misal: kenaikan nominal dari Rp 40 Juta menjadi Rp 120 Juta akan otomatis menambahkan tahapan `Area Manager` / `Director`), dengan tetap **mengacu pada versi SK DoA yang telah dikunci pada `AppliedDoAPolicyHeaderId`** saat pengajuan awal demi konsistensi audit. Riwayat persetujuan pada siklus revisi sebelumnya tetap disimpan sebagai log historis.
* Dilengkapi fitur **SLA Monitoring**: setiap *step* memiliki target penyelesaian (`SlaHours`) yang dipantau oleh *Background Job* untuk mengirimkan pengingat otomatis.

---

### 3.3. Modul Pengalaman Pengguna & Komunikasi (UX & Communication)

#### A. Dynamic Theming (Mantine Theme Engine)
* Mendukung mode **Light**, **Dark**, dan **System Default** dengan penyimpanan preferensi di database profil pengguna dan `localStorage`.
* Kustomisasi palet warna korporat (*Primary Brand Color*), *border radius*, dan kerapatan tabel (*compact/comfortable*) melalui `MantineProvider`.

#### B. Sistem Notifikasi Multi-Kanal (Notification Center)
* **In-App Real-time Notification:** Menggunakan **SignalR** untuk mendorong notifikasi instan ke ikon lonceng (*Notification Bell*) saat ada dokumen masuk ke *Approval Inbox*, dokumen disetujui/ditolak, atau pengumuman sistem.
* **Email Notification:** Menggunakan *template engine* HTML (Razor/Scriban) yang dikirim secara asinkron melalui antrean *Background Job* (dilengkapi mekanisme *retry* jika SMTP gagal).

#### C. Internasionalisasi (i18n - Multi-bahasa)
* Mendukung pergantian bahasa secara instan (**Bahasa Indonesia** & **English**) tanpa memuat ulang halaman (*hot-reload* menggunakan `react-i18next`).
* Pesan validasi dan pesan kesalahan dari API .NET diterjemahkan secara dinamis berdasarkan header `Accept-Language` yang dikirim oleh klien React.

---

### 3.4. Modul Keamanan Data & Analitik (Data Security, DMS & Analytics)

#### A. Automatic Audit Trail (EF Core Interceptor)
* Menggunakan `SaveChangesInterceptor` di EF Core untuk menyadap seluruh operasi `Added`, `Modified`, dan `Deleted` pada entitas bisnis dan konfigurasi (termasuk perubahan DoA dan hak akses).
* Menyimpan snapshot **OldValues** dan **NewValues** dalam format JSON, daftar kolom yang berubah (`AffectedColumns`), `UserId` pelaku, `IpAddress`, `UserAgent`, serta `Timestamp` UTC.
* Tabel `AuditLogs` bersifat *Immutable* (*Append-Only* — tidak memiliki endpoint Update maupun Delete).

#### B. Document Management System (DMS) Terpadu
* Menyediakan layanan terpusat untuk penyimpanan lampiran dokumen transaksi, foto profil, dan dokumen SK DoA.
* **Arsitektur Storage Provider:** Menggunakan pola *Strategy/Adapter* (`IStorageProvider`) yang mendukung penyimpanan **Local File System** (untuk development/on-premise sederhana) dan **S3-Compatible Object Storage** (MinIO / AWS S3 untuk production).
* **Keamanan File:** Validasi ketat terhadap *MIME Type* dan *Magic Bytes* (mencegah eksekusi *script* berbahaya), perhitungan *Checksum SHA-256* untuk memastikan integritas dokumen SK/kontrak, serta akses unduh menggunakan *Signed URL* atau endpoint terproteksi otorisasi.

#### C. Reporting & Dynamic Export Engine
* Komponen tabel analitik di frontend menggunakan `mantine-react-table` dengan fitur *server-side pagination*, *multi-column sorting*, *filtering*, dan *column pinning/visibility*.
* **Export Engine:** Mendukung ekspor data ke format **Excel (`.xlsx`)** menggunakan *ClosedXML*, **CSV**, dan pencetakan dokumen resmi berformat **PDF** (seperti lembar *Purchase Order* atau *Approval Routing Slip* lengkap dengan QR Code validasi dan riwayat tanda tangan elektronik) menggunakan *QuestPDF*.

---

## 4. Desain Skema Database Inti (ERD & Spesifikasi Tabel)

Seluruh tabel menggunakan `Id` bertipe `Guid` (UUID) dan mewarisi properti *Base Auditable Entity* (`CreatedAt`, `CreatedBy`, `UpdatedAt`, `UpdatedBy`, `IsDeleted`).

### 4.1. Kelompok Tabel Organisasi & Otorisasi 2 Dimensi
1. **`OrganizationUnits` (Pohon Organisasi Berjenjang):**
   * `Id` (PK, Guid)
   * `Code` (String, Unique — contoh: `HO`, `AREA-SUM1`, `DEPT-AGRO`, `DEPT-MILL`)
   * `Name` (String — contoh: `Area Sumatera 1`, `Department Agronomy`)
   * `UnitType` (String/Enum: `COMPANY`, `REGIONAL`, `AREA`, `DEPARTMENT`, `SECTION`)
   * `ParentUnitId` (Nullable FK ke `OrganizationUnits.Id` — membentuk hirarki *Parent-Child*)
   * `IsActive` (Boolean)

2. **`JobLevels` (Sumbu 1 — Hirarki Jabatan Kerja):**
   * `Id` (PK, Guid)
   * `Code` (String, Unique: `STAFF`, `MGR`, `AM`, `GM`, `DIR`, `MD`)
   * `Name` (String: `Staff`, `Manager`, `Area Manager`, `General Manager`, `Director`, `Managing Director`)
   * `RankOrder` (Int: `10`, `20`, `30`, `40`, `50`, `60` — untuk komparasi matematis jenjang jabatan)

3. **`Roles`, `Permissions`, `RolePermissions` (Sumbu 2 — Peran Teknis RBAC):**
   * `Roles`: `Id`, `Code` (`EMPLOYEE`, `AUDITOR`, `SERVICEDESK`, `MASTER_DATA`, `SUPERADMIN`), `Name`, `Description`.
   * `Permissions`: `Id`, `Code` (contoh: `DoA.Manage`, `User.ResetPassword`, `AuditLog.Read`), `Module`, `Description`.
   * `RolePermissions`: Tabel *pivot* (`RoleId`, `PermissionId`).

4. **`Users` & `UserRoles`:**
   * `Users`: `Id`, `EmployeeNumber`, `Username`, `Email`, `PasswordHash`, `FullName`, `JobLevelId` (FK), `PrimaryOrgUnitId` (FK ke `OrganizationUnits`), `DirectSupervisorId` (Nullable Self-FK ke `Users.Id`), `AvatarDmsFileId` (Nullable FK ke `DmsFiles`), `SignatureDmsFileId` (Nullable FK), `PreferredLanguage` (`id`/`en`), `PreferredTheme` (`light`/`dark`), `IsActive`.
   * `UserRoles`: Tabel *pivot* (`UserId`, `RoleId`).

---

### 4.2. Kelompok Tabel DoA Matrix (Header-Detail) & 3-Axis Approver Resolution
1. **`DocumentTypes` & `DocumentSubCategories`:**
   * `DocumentTypes`: `Id`, `Code` (Unique: `PO`, `DCP`, `PR`, `CAPEX`, `MASTER_REQ`), `Name`, `HasFinancialPlafond` (Bool).
   * `DocumentSubCategories`: `Id`, `DocumentTypeId` (FK), `Code` (contoh: `ASSET`, `AGRO_CHEM`, `IT_EQUIP`, `GENERAL`), `Name`.

2. **`DoAPolicyHeaders` (Header SK Kebijakan DoA):**
   * `Id` (PK, Guid)
   * `PolicyNumber` (String, Unique — contoh: `SK-DIR/2026/XI/004`)
   * `Title` (String — contoh: `Matriks Kewenangan Persetujuan PO & DCP Tahun 2026`)
   * `EffectiveFrom` (DateTime UTC)
   * `EffectiveTo` (Nullable DateTime UTC)
   * `Version` (Int — `1`, `2`, dst.)
   * `Status` (Enum: `DRAFT`, `PENDING_APPROVAL`, `ACTIVE`, `SUPERSEDED`, `ARCHIVED`)
   * `OfficialAttachmentFileId` (FK ke `DmsFiles.Id` — **Wajib terisi saat status `ACTIVE`** sebagai bukti lampiran SK resmi)
   * `Remarks` (Text)
   * `ApprovedByUserId` (Nullable FK), `ApprovedAt` (Nullable DateTime)

3. **`DoAPolicyDetails` (Baris Matriks Plafond per Dokumen & Jabatan):**
   * `Id` (PK, Guid)
   * `DoAPolicyHeaderId` (FK ke `DoAPolicyHeaders.Id`)
   * `DocumentTypeCode` (FK/String — contoh: `PO`, `DCP`)
   * `SubCategoryCode` (String — Default: `ALL`, atau spesifik misal `ASSET` jika plafondnya berbeda)
   * `OrgUnitTypeScope` (String — Default: `ALL`, atau spesifik unit tertentu)
   * `JobLevelId` (FK ke `JobLevels.Id` — `MGR`, `AM`, `GM`, `DIR`, `MD`)
   * `MinAmount` (Decimal(18,2) — contoh: `0`)
   * `MaxAmount` (Decimal(18,2) — Plafond maksimal, contoh: `50000000` untuk PO Manager, `75000000` untuk DCP Manager)
   * `Currency` (String — Default: `IDR`)
   * `StepBehavior` (Enum: `MANDATORY_REVIEW`, `FINAL_IF_SUFFICIENT`, `SKIP_IF_INSUFFICIENT`)
   * `SlaHours` (Int — Default: `24`)

4. **`ApprovalAuthorityAssignments` (Tabel Pengikat `UserId` ke Otoritas Organisasi & Kategori):**
   * `Id` (PK, Guid)
   * `UserId` (FK ke `Users.Id` — **Tempat `User01`, `User02`, dst. ditempelkan**)
   * `JobLevelCode` (String — contoh: `MGR`, `AM`, `DIR`)
   * `OrgUnitId` (FK ke `OrganizationUnits.Id` — menentukan cakupan Department, Area, atau HO)
   * `DocTypeCode` (String — `PO`, `DCP`, atau `ALL`)
   * `SubCategoryCode` (String — `ASSET`, `AGRO_CHEM`, atau `ALL`)
   * `PriorityOrder` (Int — Default `1` untuk *Primary Holder*)
   * `EffectiveFrom` (DateTime), `EffectiveTo` (Nullable DateTime), `IsActive` (Bool)

5. **`ApprovalDelegations` (Delegasi Sementara / Cuti):**
   * `Id` (PK, Guid)
   * `DelegatorUserId` (FK ke `Users.Id` — pemberi kuasa, misal `User01`)
   * `DelegateeUserId` (FK ke `Users.Id` — penerima kuasa sementara)
   * `DocTypeCode` (String — `ALL` atau spesifik `PO`)
   * `StartDate` (DateTime), `EndDate` (DateTime)
   * `Reason` (String), `AttachmentDmsFileId` (Nullable FK — surat tugas/cuti), `IsActive` (Bool)

---

### 4.3. Kelompok Tabel Eksekusi Workflow, DMS, & Audit
1. **`WorkflowInstances` (Header Transaksi Alur Kerja):**
   * `Id` (PK, Guid), `ReferenceTransactionId` (Guid — ID dokumen PO/DCP), `ReferenceNumber` (String — misal `PO/2026/11/0001`), `DocTypeCode` (`PO`/`DCP`), `SubCategoryCode` (`ASSET`/`AGRO_CHEM`), `TransactionAmount` (Decimal(18,2)), `RequesterUserId` (FK), `RequesterOrgUnitId` (FK), `AppliedDoAPolicyHeaderId` (FK ke `DoAPolicyHeaders.Id` — mengunci versi SK DoA saat pengajuan), `CurrentRevisionCycle` (Int — Default `1`, bertambah saat *Re-Submit* pasca revisi), `CurrentStepSequence` (Int), `Status` (`IN_PROGRESS`, `APPROVED`, `REJECTED`, `REVISED`, `CANCELLED`).
2. **`WorkflowSteps` (Rute & Riwayat Persetujuan):**
   * `Id` (PK, Guid), `WorkflowInstanceId` (FK), `RevisionCycle` (Int — mengikat step pada siklus pengajuan ke-1, ke-2, dst.), `Sequence` (Int: `1`, `2`, `3`), `TargetJobLevelCode` (`MGR`, `AM`, `DIR`), `ResolvedOrgUnitId` (FK — unit tempat approver ditemukan), `PlafondLimitAtStep` (Decimal), `AssignedUserId` (FK — hasil resolusi 3-Axis), `ActualActionUserId` (Nullable FK — terisi saat dieksekusi, bisa berbeda jika didelegasikan), `IsDelegatedAction` (Bool), `StepRoleType` (`REVIEW_ESCALATE` atau `FINAL_APPROVAL`), `Status` (`WAITING`, `PENDING`, `APPROVED`, `REJECTED`, `SENT_BACK`, `SKIPPED`), `Comments` (Text), `ActionTakenAt` (Nullable DateTime), `DueDateSla` (DateTime).
3. **`DmsFiles` (Document Management System):**
   * `Id` (PK, Guid), `OriginalFileName`, `StoredFileName`, `StoragePath`, `ContentType` (`application/pdf`, `image/webp`), `FileSizeInBytes` (Long), `Sha256Checksum` (String), `ModuleCategory` (`DOA_POLICY_SK`, `TRANSACTION_ATTACHMENT`, `USER_AVATAR`), `IsPublic` (Bool).
4. **`AuditLogs`:**
   * `Id` (PK, Guid), `UserId` (Nullable Guid), `UserName`, `ActionType` (`CREATE`, `UPDATE`, `DELETE`, `APPROVE`, `LOGIN`), `EntityName`, `EntityPrimaryKey`, `OldValuesJson` (`jsonb`), `NewValuesJson` (`jsonb`), `AffectedColumnsJson` (`jsonb`), `IpAddress`, `UserAgent`, `CreatedAtUtc` (`timestamptz`).

---

## 5. Matriks Hak Akses Awal (Seed Data Otorisasi)

| Level / Role | Kategori Sumbu | Cakupan Data (ABAC Scope) | Hak Akses Utama di Sistem |
| :--- | :--- | :--- | :--- |
| **Staff** | Sumbu 1 (`Rank: 10`) | Dokumen milik sendiri (`CreatedBy == Self`) | Membuat pengajuan dokumen (PO, DCP, dll.), melampirkan file pendukung, memantau status *workflow* miliknya. |
| **Manager** | Sumbu 1 (`Rank: 20`) | Unit Department (`DEPT-*`) & Spesialisasi Sub-Kategori (`ASSET`, `AGRO_CHEM`, dll.) | Menyetujui/menolak dokumen sesuai penugasan `ApprovalAuthorityAssignments` dan plafond DoA (misal: PO s/d 50jt, DCP s/d 75jt). |
| **Area Manager** | Sumbu 1 (`Rank: 30`) | Payung Unit Area (`AREA-*` yang membawahi beberapa Department) | Menyetujui eskalasi dokumen dari berbagai Department di bawah Area-nya sesuai plafond Area Manager, melihat laporan konsolidasi Area. |
| **General Manager** | Sumbu 1 (`Rank: 40`) | Payung Regional / Divisi | Menyetujui dokumen di atas plafond Area Manager, akses *Executive Analytics* tingkat divisi. |
| **Director** | Sumbu 1 (`Rank: 50`) | Direktorat / *Company-wide* | Menyetujui dokumen bernilai besar (misal: PO s/d 100jt, DCP s/d 200jt), memantau dashboard korporat. |
| **Managing Director (MD)** | Sumbu 1 (`Rank: 60`) | *Enterprise / Global* | Pemegang plafond tertinggi (*Unlimited / Top Tier*) untuk persetujuan strategis. |
| **Auditor** | Sumbu 2 (`System Role`) | *Global Read-Only* | Melihat seluruh transaksi lintas departemen, mengunduh **SK Resmi DoA (PDF)**, menginspeksi *Audit Trail* (`OldValue` vs `NewValue`), mengekspor laporan audit. **Dilarang melakukan Create/Update/Delete/Approve.** |
| **Servicedesk** | Sumbu 2 (`System Role`) | Operasional Bantuan Pengguna | *Reset password*, membuka akun terkunci (*unlock*), memantau *health check* sistem, melihat posisi *workflow* yang macet (*bottleneck inspection*) tanpa bisa mengubah nilai transaksi. |
| **Team Master Data** | Sumbu 2 (`System Role`) | Modul Konfigurasi & Master Data | Mengelola pohon `OrganizationUnits`, menyusun *Draft* **Header-Detail DoA Matrix** beserta unggahan SK PDF-nya, serta memetakan `UserId` pada tabel **`ApprovalAuthorityAssignments`**. |
| **SuperAdmin** | Sumbu 2 (`System Role`) | *Full Technical System Configuration* | Mengelola *Roles & Permissions*, pengaturan *storage* DMS, SMTP, dan konfigurasi teknis. *(Catatan SoD: SuperAdmin tidak otomatis menjadi Approver transaksi bisnis kecuali `UserId`-nya ditugaskan di `ApprovalAuthorityAssignments`).* |

---

## 6. Spesifikasi Antarmuka Pengguna (UI/UX Mantine)

1. **Halaman Konfigurasi DoA Matrix (Header-Detail + PDF Viewer):**
   * **Panel Header:** Form input `PolicyNumber`, `Title`, `EffectiveFrom`, `Status Badge`, serta komponen `@mantine/dropzone` untuk mengunggah dokumen PDF SK Direksi. Dilengkapi tombol **Preview SK (Split-Screen Modal)** agar pengguna dan *Auditor* dapat membaca dokumen PDF resmi berdampingan dengan tabel angka plafond.
   * **Panel Detail:** Tabel interaktif berbasis `@mantine/form` (*nested list*) untuk menambah/mengubah baris aturan (`DocumentTypeCode`, `SubCategoryCode`, `JobLevel`, `MinAmount`, `MaxAmount` dengan pemisah ribuan otomatis, dan `SlaHours`).
2. **Halaman Matriks Penugasan Approver (`ApprovalAuthorityAssignments`):**
   * Dilengkapi komponen **Organization Tree Explorer** di sisi kiri (menampilkan pohon `HO` $\rightarrow$ `Area` $\rightarrow$ `Department`) dan tabel penugasan di sisi kanan untuk menempelkan `UserId` ke kombinasi `JobLevel`, `DocTypeCode` (`PO`, `DCP`), dan `SubCategoryCode` (`ASSET`, `AGRO_CHEM`).
   * Dilengkapi fitur **Workflow Route Simulator**: pengguna dapat melakukan simulasi uji coba (misal: *"Jika `User03` di Dept. Agronomy mengajukan `DCP` Rp 120 Juta, siapa saja urutan `UserId` yang akan menerima dokumen?"*) untuk memvalidasi konfigurasi sebelum disimpan.

---

## 7. Kebutuhan Non-Fungsional (Non-Functional Requirements)

* **Keamanan Aplikasi:** Kepatuhan terhadap OWASP Top 10, proteksi CSRF, *Rate Limiting* pada endpoint autentikasi, enkripsi kata sandi menggunakan `Argon2id` atau `BCrypt`, serta sanitasi input otomatis.
* **Performa & Skalabilitas:** Waktu respons API rata-rata di bawah `200ms` untuk operasi baca (didukung *caching* memori/Redis untuk hirarki `OrganizationUnits` dan kebijakan DoA yang sedang `ACTIVE`).
* **Konsistensi & Integritas Database (PostgreSQL Parity):** Seluruh skema, indeks `jsonb` pada `AuditLogs`, presisi `numeric(18,2)`, dan *query* LINQ diuji langsung di atas mesin **PostgreSQL** sejak pengembangan lokal hingga *production*.

---

## 8. Peta Jalan Pengembangan (Development Roadmap)

* **Fase 1 — Foundation & PostgreSQL Setup (Minggu 1):**
  Inisialisasi Clean Architecture .NET, konfigurasi EF Core dengan provider **PostgreSQL** (`Npgsql`) beserta `docker-compose.yml` untuk database pengembangan lokal, integrasi Serilog, serta setup proyek React + Vite + Mantine UI v7 (Theming, i18n, & kompatibilitas `mantine-react-table` v2).
* **Fase 2 — Security, 2-Axis Authorization & Organization Tree (Minggu 2):**
  Implementasi JWT Auth, manajemen profil & foto, entitas `OrganizationUnits`, `JobLevels`, `Roles/Permissions`, dukungan otorisasi multi-posisi (Plt/Pjs), serta *Custom Authorization Policy* di .NET dan `useAccess()` hook di React.
* **Fase 3 — DMS & Audit Trail Interceptor (Minggu 3):**
  Pembangunan modul penyimpanan file (`DmsFiles`) dan `SaveChangesInterceptor` untuk pencatatan otomatis `AuditLogs` berbasis kolom `jsonb` PostgreSQL.
* **Fase 4 — Contextual DoA (Header-Detail) & 3-Axis Workflow Engine (Minggu 4-5):**
  Implementasi CRUD Header-Detail DoA Matrix (beserta validasi lampiran SK PDF), tabel `ApprovalAuthorityAssignments`, `ApprovalDelegations`, algoritma *3-Axis Approver Resolution* (lengkap dengan *Auto-Skip Initiator Rank / SoD*, *Pre-Submit Dry-Run Validation*, dan *Re-Submit Route Recalculation* berbasis `AppliedDoAPolicyHeaderId`), serta UI *Workflow Route Simulator*.
* **Fase 5 — Real-time Notification, Reporting & Sample Transactions (Minggu 6):**
  Integrasi SignalR Notification Hub, modul ekspor Excel/PDF, serta pembuatan 2 modul transaksi contoh (**Purchase Order [PO]** dengan pemilihan `SubCategoryCode` *Asset/Agro Chemical* di level Header dan **Direct Cash Payment [DCP]** lintas departemen/area) sebagai pembuktian konsep (*Proof of Concept*) menyeluruh.