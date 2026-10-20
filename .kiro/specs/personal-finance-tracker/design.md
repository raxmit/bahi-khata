# Design Document: Personal Finance Tracker

## Overview

The Personal Finance Tracker is a full-stack web application consisting of an Angular 21 SPA frontend, a NestJS 12 REST API backend, a Prisma ORM layer, and a MySQL database. It enables the single owner to record income and expense transactions, categorize them, view periodic summaries, and filter by various criteria. The initial supported setup is local-only. The Lightsail design later in this document is a deferred proposal; no deployment is authorized until the end-to-end, security, migration, CI, staging, backup, and rollback gates are complete and separately approved.

The architecture follows a clean separation between the UI layer, the HTTP API layer, application logic (subsystems), and the persistence layer. All business logic (validation, summarization, filtering) lives in the NestJS backend, keeping it independently testable without UI or HTTP dependencies.

Key design goals:
- All business logic is implemented as pure, injectable NestJS services that are easy to property-test
- The Angular UI is responsive from 320px to 2560px using CSS media queries and flexible layout
- MySQL via Prisma is the sole persistence mechanism, abstracted behind a repository service interface
- The initial product has one owner. Until authentication and owner authorization are implemented and verified, bind the API to loopback and do not expose it to a network; CORS is not an access-control mechanism.
- The configured currency is INR. Persist money as exact MySQL `DECIMAL(15,2)` through Prisma `Decimal`, and exchange monetary JSON values as canonical decimal strings with exactly two fraction digits. Do all summary arithmetic in decimal form.
- Error states are surfaced via HTTP error codes on the API and inline field validation on the frontend
- The Angular frontend communicates exclusively with the NestJS backend over a RESTful JSON API

> **Stack versions (Node.js 24.x compatible):**
> - Angular 21 + Angular CLI 21 (Node `^20.19.0 || ^22.12.0 || ^24.0.0`)
> - NestJS 12 — full ESM, Vitest, oxlint (Node 20.19+ / 22.12+)
> - Node.js 24.x (tested on v24.12.0)

---

## Architecture

The application uses a full-stack layered architecture:

```
┌──────────────────────────────────────────────────────────────┐
│               Angular SPA (AWS Lightsail Instance)           │
│   Dashboard │ Transactions │ Insights │ Categories            │
└─────────────────────────┬────────────────────────────────────┘
                          │  HTTP/REST (JSON)
┌─────────────────────────▼────────────────────────────────────┐
│          NestJS REST API (AWS Lightsail Instance)            │
│   TransactionsModule │ CategoriesModule │ SummaryModule       │
│   Validator Service  │ Summarizer Service │ FilterEngine      │
└─────────────────────────┬────────────────────────────────────┘
                          │  Prisma Client
┌─────────────────────────▼────────────────────────────────────┐
│                     Prisma ORM Layer                         │
└─────────────────────────┬────────────────────────────────────┘
                          │  TCP/3306
┌─────────────────────────▼────────────────────────────────────┐
│         MySQL Database (AWS Lightsail Managed Database)      │
└──────────────────────────────────────────────────────────────┘
```

### Technology Choices

| Concern | Choice | Rationale |
|---|---|---|
| UI Framework | Angular 21 + TypeScript | Component model fits the sectioned UI; two-way binding simplifies form handling; TypeScript catches data model errors at compile time; natively supports Node 24 |
| HTTP Client | Angular `HttpClient` | Built-in to Angular; supports typed responses, interceptors, and error handling |
| State Management | Angular Services + RxJS BehaviorSubject | Idiomatic Angular; reactive streams align well with async API calls |
| Styling | Angular CSS encapsulation + CSS custom properties | Scoped component styles; no runtime CSS-in-JS cost |
| Build Tool | Angular CLI | Standard Angular build toolchain with optimization and code-splitting |
| Testing (frontend unit) | Karma + Jasmine (default Angular) | Built-in Angular testing setup; integrates with Angular TestBed |
| Testing (backend unit) | Jest + NestJS testing utilities | NestJS default; supports module-level testing with dependency injection |
| Testing (property) | fast-check | Mature JS/TS property-based testing library; works with both Jest and Jasmine |
| Date Handling | date-fns | Lightweight, tree-shakable, pure functions |
| Backend Framework | NestJS (Node.js) | Opinionated structure mirrors Angular conventions; first-class TypeScript support; modular architecture |
| ORM | Prisma | Type-safe database client; schema-first migrations; excellent TypeScript integration |
| Database | MySQL 8 | Relational model suits transactional finance data; AWS Lightsail managed database support |
| Deployment | AWS Lightsail (deferred) | Candidate hosting only after release gates and explicit approval |
| CI | GitHub Actions | Run checks only; no deployment credentials or automatic deployment |
| Source Control | GitHub | Monorepo with `frontend/` and `backend/`; pushes do not authorize a release |
| Local Dev Environment | Docker + Docker Compose | All services (Angular dev server, NestJS API, MySQL) run as containers; single `docker compose up` starts the full stack |


---

## Components and Interfaces

### Backend: NestJS Modules and Service Interfaces

The four subsystems map to NestJS injectable services. They have no shared mutable state and are injected through NestJS's DI container.

#### ValidatorService

```typescript
interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>; // fieldName -> error message
}

@Injectable()
class ValidatorService {
  validateTransaction(input: CreateTransactionDto): ValidationResult;
  validateCategory(input: CreateCategoryDto, existing: Category[]): ValidationResult;
  validateFilter(filter: FilterCriteriaDto): ValidationResult;
  truncateNote(note: string): { value: string; truncated: boolean };
}
```

#### RepositoryService (wraps Prisma)

```typescript
@Injectable()
class TransactionRepository {
  create(data: CreateTransactionDto): Promise<Transaction>;
  update(id: string, changes: UpdateTransactionDto): Promise<Transaction>;
  delete(id: string): Promise<void>;
  findAll(): Promise<Transaction[]>;
  findById(id: string): Promise<Transaction | null>;
}

@Injectable()
class CategoryRepository {
  create(data: CreateCategoryDto): Promise<Category>;
  delete(id: string): Promise<void>;
  findAll(): Promise<Category[]>;
  findByNameAndType(name: string, type: TransactionType): Promise<Category | null>;
}
```

#### SummarizerService

```typescript
interface PeriodSummary {
  period: Period;
  startDate: string;        // ISO 8601 date string
  endDate: string;          // ISO 8601 date string
  totalIncome: string;    // INR decimal string, e.g. "1234.50"
  totalExpenses: string;
  netBalance: string;
  categoryBreakdown: CategoryTotal[]; // sorted by amount descending
  isEmpty: boolean;
}

interface CategoryTotal {
  category: string;
  type: TransactionType;
  total: string;
}

interface WeeklyBreakdown {
  weekNumber: number;
  startDate: string;
  endDate: string;
  totalIncome: string;
  totalExpenses: string;
}

@Injectable()
class SummarizerService {
  summarize(transactions: Transaction[], period: Period, date: Date): PeriodSummary;
  getWeeklyBreakdown(transactions: Transaction[], month: Date): WeeklyBreakdown[];
}
```

#### FilterEngineService

```typescript
interface FilterCriteria {
  type?: TransactionType;
  categories?: string[];
  startDate?: string;   // ISO 8601 date string
  endDate?: string;     // ISO 8601 date string
}

interface FilterResult {
  matches: Transaction[];
  hasResults: boolean;
}

@Injectable()
class FilterEngineService {
  applyFilter(transactions: Transaction[], criteria: FilterCriteria): FilterResult;
}
```

### REST API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/transactions` | List all transactions (accepts query params for filtering) |
| `POST` | `/transactions` | Create a new transaction |
| `PATCH` | `/transactions/:id` | Update an existing transaction |
| `DELETE` | `/transactions/:id` | Delete a transaction |
| `GET` | `/categories` | List all categories |
| `POST` | `/categories` | Create a new category |
| `DELETE` | `/categories/:id` | Delete a category |
| `GET` | `/summary` | Get period summary (query params: `period`, `date`) |
| `GET` | `/summary/weekly` | Get weekly breakdown for a given month |

### Angular Component Tree

```
AppComponent
├── ErrorHandlerInterceptor (HTTP error interceptor)
├── AppStateService (global state via BehaviorSubject)
├── NavbarComponent (responsive: side panel ≥768px, bottom bar <768px)
└── RouterOutlet
    ├── DashboardComponent
    │   ├── SummaryCardComponent (current month totals)
    │   ├── QuickEntryFormComponent
    │   └── RecentTransactionsListComponent (5 most recent)
    ├── TransactionsComponent
    │   ├── FilterPanelComponent
    │   │   ├── TypeFilterComponent
    │   │   ├── CategoryFilterComponent (multi-select)
    │   │   └── DateRangeFilterComponent
    │   └── TransactionListComponent
    │       └── TransactionItemComponent (with edit/delete actions)
    ├── InsightsComponent
    │   ├── PeriodSelectorComponent (weekly / monthly / yearly)
    │   ├── PeriodNavigatorComponent (prev / next)
    │   ├── SummaryCardComponent (income, expenses, net)
    │   ├── CategoryBreakdownListComponent
    │   └── WeeklyBreakdownTableComponent (monthly period only)
    └── CategoriesComponent
        ├── CategoryListComponent (income categories)
        ├── CategoryListComponent (expense categories)
        └── AddCategoryFormComponent
```

### Angular Services (HTTP Layer)

```typescript
@Injectable({ providedIn: 'root' })
class TransactionApiService {
  getAll(filter?: FilterCriteriaDto): Observable<Transaction[]>;
  create(data: CreateTransactionDto): Observable<Transaction>;
  update(id: string, changes: UpdateTransactionDto): Observable<Transaction>;
  delete(id: string): Observable<void>;
}

@Injectable({ providedIn: 'root' })
class CategoryApiService {
  getAll(): Observable<Category[]>;
  create(data: CreateCategoryDto): Observable<Category>;
  delete(id: string): Observable<void>;
}

@Injectable({ providedIn: 'root' })
class SummaryApiService {
  getSummary(period: Period, date: string): Observable<PeriodSummary>;
  getWeeklyBreakdown(month: string): Observable<WeeklyBreakdown[]>;
}
```


---

## Data Models

### Prisma Schema

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model Transaction {
  id        String   @id @default(uuid())
  amount    Decimal @db.Decimal(15, 2)
  type      TransactionType
  category  String
  date      DateTime @db.Date
  note      String?  @db.VarChar(250)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("transactions")
}

model Category {
  id        String          @id @default(uuid())
  name      String
  type      TransactionType
  isDefault Boolean         @default(false)

  @@unique([name, type])
  @@map("categories")
}

enum TransactionType {
  Income
  Expense
}
```

### TypeScript Interfaces (shared types)

```typescript
type TransactionType = 'Income' | 'Expense';
type Period = 'weekly' | 'monthly' | 'yearly';

interface Transaction {
  id: string;             // UUID v4
  amount: string;         // positive canonical INR decimal, exactly 2 fraction digits
  type: TransactionType;  // 'Income' | 'Expense', required
  category: string;       // category name, required
  date: string;           // ISO 8601 date string (YYYY-MM-DD), required
  note?: string;          // optional, max 250 chars
  createdAt: string;      // ISO 8601 datetime, set on creation
  updatedAt: string;      // ISO 8601 datetime, updated on edit
}

interface Category {
  id: string;             // UUID v4
  name: string;           // unique per type (enforced by DB unique constraint)
  type: TransactionType;
  isDefault: boolean;     // true for built-in categories; cannot be deleted
}
```

### NestJS DTOs

```typescript
// Create transaction
class CreateTransactionDto {
  // Validate the decimal string before constructing Prisma.Decimal. Do not
  // coerce money through JavaScript Number.
  @Matches(/^(?:0|[1-9]\d{0,12})\.\d{2}$/)
  amount: string;

  @IsEnum(TransactionType)
  type: TransactionType;

  @IsString() @IsNotEmpty()
  category: string;

  @IsDateString()
  date: string;

  @IsOptional() @MaxLength(250)
  note?: string;
}

// Update transaction (all fields optional)
class UpdateTransactionDto extends PartialType(CreateTransactionDto) {}

// Create category
class CreateCategoryDto {
  @IsString() @IsNotEmpty()
  name: string;

  @IsEnum(TransactionType)
  type: TransactionType;
}

// Filter query params
class FilterCriteriaDto {
  @IsOptional() @IsEnum(TransactionType)
  type?: TransactionType;

  @IsOptional() @IsString({ each: true })
  categories?: string[];

  @IsOptional() @IsDateString()
  startDate?: string;

  @IsOptional() @IsDateString()
  endDate?: string;
}
```

### Default Categories

**Income**: Salary, Freelance, Investment, Gift  
**Expense**: Food, Rent, Transport, Healthcare, Entertainment, Utilities

Default categories are seeded via a Prisma seed script (`prisma/seed.ts`) and have `isDefault: true`. They cannot be deleted (enforced at the service layer).


---

## Correctness Properties


*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Transaction Persistence Round-Trip

*For any* valid `CreateTransactionDto`, posting it to `POST /transactions` and then calling `GET /transactions` SHALL return a list containing a transaction whose `amount`, `type`, `category`, `date`, and `note` fields match the input exactly.

**Validates: Requirements 1.1**

### Property 2: Transaction Update Preserves Identity

*For any* existing transaction and any valid set of changes, calling `PATCH /transactions/:id` and then retrieving the transaction by its id SHALL return a record with the updated field values and the same `id`.

**Validates: Requirements 1.7**

### Property 3: Transaction Deletion Removes Record

*For any* transaction that exists in the database, calling `DELETE /transactions/:id` SHALL result in `GET /transactions` no longer containing any transaction with that `id`.

**Validates: Requirements 1.8**

### Property 4: Non-Positive Amounts Are Rejected

*For any* transaction input where `amount <= 0`, `ValidatorService.validateTransaction()` SHALL return `valid === false` with a non-empty error string associated with the `amount` field.

**Validates: Requirements 1.3**

### Property 5: Future Dates Are Rejected

*For any* transaction input where the `date` string represents a calendar date strictly after today's date, `ValidatorService.validateTransaction()` SHALL return `valid === false` with a non-empty error string associated with the `date` field.

**Validates: Requirements 1.4**

### Property 6: Missing Required Fields Are Rejected

*For any* transaction input where one or more of `amount`, `type`, `category`, or `date` is `null` or absent, `ValidatorService.validateTransaction()` SHALL return `valid === false` and the `errors` map SHALL contain a key for each missing field.

**Validates: Requirements 1.2**

### Property 7: Note Truncation Invariant

*For any* string `note` whose length exceeds 250 characters, `ValidatorService.truncateNote(note)` SHALL return an object where `value.length === 250` and `truncated === true`.

**Validates: Requirements 1.6**

### Property 8: Category Uniqueness Enforcement

*For any* existing category list and any `CreateCategoryDto` whose `name` and `type` match an entry already present in the list, `ValidatorService.validateCategory(input, existing)` SHALL return `valid === false` with a non-empty error message.

**Validates: Requirements 2.3**

### Property 9: Category Save Round-Trip

*For any* valid `CreateCategoryDto` with a name that is unique within its type, calling `POST /categories` and then `GET /categories` SHALL return a list that contains a category matching the saved name and type.

**Validates: Requirements 2.2**

### Property 10: Category Alphabetical Sort Invariant

*For any* array of `Category` objects passed to the category sort function, the returned array SHALL be in ascending lexicographic order by `name` within each `type` group (Income categories sorted among themselves, Expense categories sorted among themselves).

**Validates: Requirements 2.5**

### Property 11: Summary Net Balance Arithmetic

*For any* set of valid INR transactions and any selected period, `SummarizerService.summarize()` SHALL produce a `PeriodSummary` where exact decimal arithmetic satisfies `netBalance === totalIncome - totalExpenses`; monetary fields are returned as canonical two-decimal strings.

**Validates: Requirements 3.1, 3.5**

### Property 12: Summary Period Boundary Correctness

*For any* set of transactions with dates distributed across multiple periods, `SummarizerService.summarize(transactions, period, date)` SHALL include in `totalIncome` and `totalExpenses` only transactions whose `date` falls within the computed `[startDate, endDate]` range for that period; transactions outside the window SHALL NOT contribute to any total.

**Validates: Requirements 3.3, 3.4**

### Property 13: Category Breakdown Descending Order

*For any* set of transactions passed to `SummarizerService.summarize()`, the `categoryBreakdown` array in the result SHALL be sorted in descending order by `total` (largest total first, smallest last).

**Validates: Requirements 3.2**

### Property 14: Weekly Breakdown Partitioning

*For any* set of transactions all falling within a given calendar month, `SummarizerService.getWeeklyBreakdown(transactions, month)` SHALL produce week buckets such that every transaction appears in exactly one week bucket and the sum of all week bucket totals equals the monthly `totalIncome` and `totalExpenses` respectively.

**Validates: Requirements 3.6**

### Property 15: Single-Criterion Filter Correctness

*For any* set of transactions and a `FilterCriteria` containing exactly one active criterion (type, categories, or date range), every transaction returned by `FilterEngineService.applyFilter()` SHALL satisfy that criterion:
- Type filter: `result.type === criteria.type`
- Category filter: `criteria.categories.includes(result.category)`
- Date range filter: `result.date >= criteria.startDate && result.date <= criteria.endDate`

**Validates: Requirements 4.1, 4.2, 4.3**

### Property 16: Multi-Criterion Filter Conjunction

*For any* set of transactions and a `FilterCriteria` containing two or more active criteria, every transaction returned by `FilterEngineService.applyFilter()` SHALL satisfy ALL active criteria simultaneously (logical AND semantics).

**Validates: Requirements 4.4**

### Property 17: Empty Criteria Returns All Transactions

*For any* non-empty set of transactions, calling `FilterEngineService.applyFilter(transactions, {})` with no active criteria SHALL return all input transactions unchanged (same count, same set of ids).

**Validates: Requirements 4.6**

### Property 18: Invalid Date Range Is Rejected

*For any* `FilterCriteria` where `startDate` is strictly later than `endDate`, `ValidatorService.validateFilter(criteria)` SHALL return `valid === false` with a non-empty error message identifying the invalid date range.

**Validates: Requirements 4.7**

### Property 19: Recent Transactions Selection

*For any* list of transactions, `getRecentTransactions(transactions, 5)` SHALL return at most 5 transactions, all of which have dates that are among the most recent in the input set (ordered by `date` descending, then `createdAt` descending for ties), and the result length SHALL equal `Math.min(5, transactions.length)`.

**Validates: Requirements 5.4**

### Property 20: Storage Persistence Round-Trip

*For any* `CreateTransactionDto` written to the database via the `TransactionRepository`, reading back the record by its `id` using Prisma's `findUnique` SHALL succeed without throwing, and the resulting object SHALL be structurally equivalent to the written data (same `amount`, `type`, `category`, `date`, `note`, preserving all field values).

**Validates: Requirements 6.2, 6.3**


---

## Infrastructure and Deployment

### AWS Lightsail Architecture

> **Deferred deployment proposal only.** This topology must not be used until the single-owner authentication and authorization boundary is implemented and verified and all release gates are satisfied. During local development, publish the API and MySQL host ports on `127.0.0.1` only; the API may listen on `0.0.0.0` inside the Compose network so the local frontend container can reach it.

```
┌─────────────────────────────────────────────────────────────────┐
│                        AWS Lightsail                            │
│                                                                 │
│  ┌─────────────────────┐     ┌─────────────────────────────┐   │
│  │  Lightsail Instance  │     │    Lightsail Instance        │   │
│  │  (Frontend)          │────▶│    (Backend)                 │   │
│  │  Angular SPA         │     │    NestJS REST API           │   │
│  │  served via Nginx    │     │    Node.js process           │   │
│  │  Port: 80/443        │     │    Port: 3000                │   │
│  └─────────────────────┘     └────────────┬────────────────┘   │
│                                            │                     │
│                          ┌─────────────────▼──────────────┐     │
│                          │  Lightsail Managed Database     │     │
│                          │  MySQL 8                        │     │
│                          │  Port: 3306 (private network)  │     │
│                          └─────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

### Frontend Instance (Angular SPA)

- **Lightsail Instance**: Linux/Unix, 512MB RAM or higher (1 GB recommended)
- **Web Server**: Nginx serves the Angular production build (`dist/` output)
- **Build**: `ng build --configuration production` generates static assets
- **Nginx config**: all routes rewritten to `index.html` to support Angular client-side routing
- **HTTPS**: Lightsail-provided static IP + Let's Encrypt certificate via Certbot

### Backend Instance (NestJS API)

- **Lightsail Instance**: Linux/Unix, 1 GB RAM or higher (2 GB recommended for Node.js)
- **Runtime**: Node.js 20 LTS; NestJS application managed by PM2 (process manager)
- **Port**: 3000 (exposed via Lightsail firewall rules; Nginx optionally reverse-proxies from 443)
- **Environment variables**: stored in `/etc/environment` or a `.env` file, not committed to source control
- **Prisma migrations**: run via `npx prisma migrate deploy` as part of the deployment script

Key environment variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Prisma connection string: `mysql://user:pass@host:3306/pftracker` |
| `PORT` | NestJS listen port (default: 3000) |
| `CORS_ORIGIN` | Allowed frontend origin (Angular SPA URL) |
| `NODE_ENV` | `production` |

### Managed Database (MySQL)

- **Lightsail Managed Database**: MySQL 8 plan (1 GB RAM standard plan)
- **Connectivity**: accessible only from within the Lightsail private network by the backend instance; no public endpoint
- **Backups**: automated daily snapshots enabled via Lightsail managed database settings
- **Schema management**: all schema changes applied through Prisma migrations; no manual DDL

### Docker Local Development Environment

All local development runs inside Docker containers using Docker Compose. A single `docker compose up` command starts the full stack with hot-reload enabled for both frontend and backend.

#### Repository Structure (Docker files)

```
bahi-khata/
├── frontend/
│   ├── Dockerfile.dev           # Angular dev server container
│   └── ...
├── backend/
│   ├── Dockerfile.dev           # NestJS dev container with ts-node/watch
│   └── ...
├── docker-compose.yml           # Full local dev stack
├── docker-compose.test.yml      # Test stack (separate MySQL for tests)
└── .env.docker                  # Local env vars (not committed)
```

#### `docker-compose.yml` (Development)

```yaml
version: '3.9'

services:
  mysql:
    image: mysql:8.0
    container_name: pftracker-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: rootpass
      MYSQL_DATABASE: pftracker
      MYSQL_USER: pfuser
      MYSQL_PASSWORD: pfpass
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    container_name: pftracker-backend
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: mysql://pfuser:pfpass@mysql:3306/pftracker
      PORT: 3000
      CORS_ORIGIN: http://localhost:4200
      NODE_ENV: development
    volumes:
      - ./backend:/app               # mount source for hot-reload
      - /app/node_modules            # preserve container node_modules
    depends_on:
      mysql:
        condition: service_healthy
    command: npm run start:dev       # NestJS watch mode

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    container_name: pftracker-frontend
    restart: unless-stopped
    ports:
      - "4200:4200"
    environment:
      - CHOKIDAR_USEPOLLING=true     # required for file watch in Docker on Windows/macOS
    volumes:
      - ./frontend:/app              # mount source for hot-reload
      - /app/node_modules
    depends_on:
      - backend
    command: ng serve --host 0.0.0.0 --poll 2000

volumes:
  mysql_data:
```

#### `backend/Dockerfile.dev`

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
EXPOSE 3000
CMD ["npm", "run", "start:dev"]
```

#### `frontend/Dockerfile.dev`

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 4200
CMD ["ng", "serve", "--host", "0.0.0.0", "--poll", "2000"]
```

#### Developer Workflow

```bash
# 1. Clone the repo
git clone https://github.com/your-org/bahi-khata.git
cd bahi-khata

# 2. Copy env file
cp .env.docker.example .env.docker

# 3. Start all services
docker compose up

# 4. Run Prisma migrations (first time or after schema changes)
docker compose exec backend npx prisma migrate dev

# 5. Seed default categories
docker compose exec backend npx prisma db seed

# Access the app
# Frontend: http://localhost:4200
# Backend API: http://localhost:3000
# MySQL: localhost:3306 (connect with any MySQL client)
```

#### `.env.docker.example` (committed to repo)

```dotenv
DATABASE_URL=mysql://pfuser:pfpass@mysql:3306/pftracker
PORT=3000
CORS_ORIGIN=http://localhost:4200
NODE_ENV=development
```

The actual `.env.docker` is listed in `.gitignore`. Only the `.example` file is committed.

#### Test Stack (`docker-compose.test.yml`)

A separate compose file spins up an isolated MySQL instance for running integration/e2e tests without polluting development data:

```yaml
version: '3.9'

services:
  mysql-test:
    image: mysql:8.0
    container_name: pftracker-mysql-test
    environment:
      MYSQL_ROOT_PASSWORD: rootpass
      MYSQL_DATABASE: pftracker_test
      MYSQL_USER: pfuser
      MYSQL_PASSWORD: pfpass
    ports:
      - "3307:3306"
    tmpfs:
      - /var/lib/mysql              # in-memory for speed; data lost on stop
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 5s
      timeout: 3s
      retries: 10
```

Run e2e tests against the test database:

```bash
docker compose -f docker-compose.test.yml up -d
docker compose exec backend DATABASE_URL=mysql://pfuser:pfpass@localhost:3307/pftracker_test npx jest --testPathPattern=e2e
docker compose -f docker-compose.test.yml down
```

### GitHub Repository Structure

The project lives in a single GitHub repository with a monorepo layout:

```
bahi-khata/                        # GitHub repository root
├── frontend/                      # Angular project
│   └── Dockerfile.dev
├── backend/                       # NestJS project
│   └── Dockerfile.dev
├── docker-compose.yml             # Local dev stack
├── docker-compose.test.yml        # Test stack
├── .env.docker.example            # Example env vars for Docker dev
├── .github/
│   └── workflows/
│       ├── frontend.yml           # Frontend CI/CD pipeline
│       └── backend.yml            # Backend CI/CD pipeline
└── README.md
```

### GitHub Actions CI/CD Pipeline (Deferred deployment proposal)

> **This section is superseded and must not be implemented as written.** The historical push-to-main deployment proposal below conflicts with the adopted local-only scope. The checked-in workflow is CI-only. Do not add automatic deployment; Lightsail remains deferred until all release gates are complete and the user separately approves a specific release.

Two workflow files are triggered on pushes to `main`. Each runs independently so a frontend-only change does not redeploy the backend and vice versa.

#### Frontend Pipeline (`.github/workflows/frontend.yml`)

Triggered by: push to `main` with changes under `frontend/**`

```
1. Checkout code
2. Set up Node.js 20
3. npm ci (install dependencies)
4. ng test --watch=false --browsers=ChromeHeadless (run unit tests)
5. ng build --configuration production (build Angular SPA)
6. SCP dist/ to frontend Lightsail instance (using SSH deploy key stored as GitHub Secret)
7. SSH into frontend instance: reload Nginx (nginx -s reload)
```

#### Backend Pipeline (`.github/workflows/backend.yml`)

Triggered by: push to `main` with changes under `backend/**`

```
1. Checkout code
2. Set up Node.js 20
3. npm ci (install dependencies in backend/)
4. npm run test (run Jest unit + property-based tests)
5. SSH into backend Lightsail instance (using SSH deploy key stored as GitHub Secret):
   a. cd /app/backend && git pull origin main
   b. npm ci --omit=dev
   c. npx prisma migrate deploy
   d. pm2 reload pf-tracker-api
```

### GitHub Secrets Required

| Secret Name | Description |
|---|---|
| `LIGHTSAIL_FRONTEND_HOST` | Static IP of the frontend Lightsail instance |
| `LIGHTSAIL_BACKEND_HOST` | Static IP of the backend Lightsail instance |
| `LIGHTSAIL_SSH_KEY` | Private SSH key for deploy access to both instances |
| `LIGHTSAIL_SSH_USER` | SSH username (e.g., `ubuntu` or `ec2-user`) |
| `DATABASE_URL` | Prisma connection string (used by backend pipeline for migrate deploy) |

### Deployment Flow

```
Developer pushes to main
         │
         ├─ changes in frontend/ ──▶ frontend.yml triggers
         │                              │
         │                              ├── npm ci + ng test
         │                              ├── ng build --configuration production
         │                              └── SCP dist/ → Lightsail frontend → nginx reload
         │
         └─ changes in backend/  ──▶ backend.yml triggers
                                       │
                                       ├── npm ci + jest tests
                                       └── SSH: git pull + npm ci + prisma migrate deploy + pm2 reload
```

### Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Production branch — merges here trigger deployment |
| `feature/*` | Feature branches — PRs opened against `main` |
| `fix/*` | Bugfix branches — PRs opened against `main` |

Pull requests and pushes run CI only. No push or merge authorizes deployment; any future deployment requires completed release gates and a separate explicit approval.

### Networking and Security

- Frontend Lightsail firewall: allow HTTP (80) and HTTPS (443) from anywhere; block all other inbound
- Backend Lightsail firewall: allow port 3000 from frontend instance IP only (or use Lightsail private networking)
- Database: no public IP; accessible only from the backend instance via the Lightsail private network
- CORS: NestJS configured to allow requests only from the Angular SPA's origin domain
- All secrets (DB credentials, SSH keys, API URLs) stored as GitHub Actions Secrets — never committed to source control
- Deploy SSH key is a dedicated key pair used only for CI/CD; not the instance's primary key


---

## Error Handling

### Validation Errors (Client-Side — Angular)

Angular reactive forms perform synchronous validation before any HTTP call is made. Each form control maps to a validator function. Errors are displayed inline adjacent to the field.

| Scenario | Angular Response |
|---|---|
| Missing required transaction field | Field marked invalid; specific `mat-error` per field rendered |
| Amount ≤ 0 | `amount` control error: "Amount must be a positive number" |
| Future date submitted | `date` control error: "Date must not be in the future" |
| Note > 250 chars | Note is truncated to 250 on input; inline character-count indicator shown |
| Duplicate category name+type | `name` control error (shown after API 409 response): "Category name must be unique per type" |
| Filter start date > end date | Date range error: "Start date must not be after end date" |

### HTTP API Errors (NestJS)

The NestJS backend returns standard HTTP status codes. A global exception filter maps domain errors to appropriate HTTP responses:

| Scenario | HTTP Status | Response Body |
|---|---|---|
| Validation failure (DTO) | `400 Bad Request` | `{ statusCode: 400, message: string[], error: "Bad Request" }` |
| Resource not found (transaction/category) | `404 Not Found` | `{ statusCode: 404, message: "Resource not found" }` |
| Duplicate category name+type | `409 Conflict` | `{ statusCode: 409, message: "Category name must be unique per type" }` |
| Attempt to delete a default category | `403 Forbidden` | `{ statusCode: 403, message: "Default categories cannot be deleted" }` |
| Database error (Prisma client error) | `500 Internal Server Error` | `{ statusCode: 500, message: "Internal server error" }` |
| Invalid date range filter | `400 Bad Request` | `{ statusCode: 400, message: "startDate must not be after endDate" }` |

### Angular HTTP Error Interceptor

An `HttpInterceptor` in the Angular application catches all non-2xx responses:

- `400`: displays inline form errors or a toast with the server's `message` field
- `404`: navigates to an error state or shows a "not found" toast
- `409`: maps back to the relevant form control's error state
- `500`: displays a generic "Something went wrong" toast and logs the error to `console.error`
- Network failures (no response): displays a "Could not reach server" toast; the unsaved form data is retained

### Runtime Errors (Angular)

A global Angular `ErrorHandler` implementation catches uncaught exceptions thrown during change detection or in components:

- Logs the full error to `console.error`
- Displays a user-friendly error message via a toast service
- Does not crash the application — the router navigates back to the dashboard as a recovery step

### NestJS Global Exception Filter

```typescript
@Catch()
class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    // Maps Prisma errors, domain errors, and unknown errors
    // to appropriate HttpException responses
    // Logs error details server-side without leaking internals to the client
  }
}
```


---

## Testing Strategy

### Dual Testing Approach

The testing strategy uses two complementary approaches across both frontend and backend:

1. **Unit tests** — specific examples, edge cases, UI component behavior, service integration
2. **Property-based tests** (fast-check) — universal properties across generated inputs, validating `ValidatorService`, `SummarizerService`, `FilterEngineService`, and `TransactionRepository` logic

### Frontend Testing (Angular — Karma + Jasmine)

Angular CLI projects use Karma as the test runner and Jasmine as the assertion framework by default. The Angular `TestBed` utility handles module-level dependency injection in tests.

| Area | Test Type | Notes |
|---|---|---|
| Default category list renders | Example | `GET /categories` mocked via `HttpClientTestingModule`; verify 10 defaults |
| Dashboard renders current-month summary | Example | Mock `SummaryApiService`; assert totals in DOM |
| Navigation: bottom bar at <768px, side panel at ≥768px | Example | Use `ViewportScroller` or CSS class checks at simulated widths |
| HTTP error 500 shows toast | Example | Mock `HttpClient` to return 500; assert toast rendered |
| Network failure retains form data | Example | Mock `HttpClient` to return network error; assert form values unchanged |
| Transaction form submits valid DTO | Example | Spy on `TransactionApiService.create()`; verify call args |
| Filter cleared restores full list | Example | Simulate filter then clear; assert full list returned |

### Backend Testing (NestJS — Jest)

NestJS generates Jest configuration by default. Services are tested with NestJS's testing module utilities. Prisma is mocked using `jest-mock-extended` or a Prisma mock client for unit tests.

| Area | Test Type | Notes |
|---|---|---|
| Controller routes return correct status codes | Example | Use NestJS `supertest` integration tests |
| Repository creates and returns matching record | Example | Prisma mock; verify call shape and return value |
| Default categories seeded on init | Example | Seed script test; verify 10 defaults present |
| Prisma error mapped to 500 response | Example | Mock Prisma to throw; assert exception filter response |
| Attempt to delete default category returns 403 | Example | Call delete with `isDefault: true` category id |

### Property-Based Test Configuration

- Library: **fast-check** (works with both Karma/Jasmine and Jest)
- Minimum iterations per property: **100** (`numRuns: 100`; raise to `500` for critical properties)
- Each property test references the design document property via a comment tag:
  - Tag format: `// Feature: personal-finance-tracker, Property {N}: {property_text}`
- Each property is implemented as a single `fc.assert(fc.property(...))` call

### Property-Based Test Coverage

Each of Properties 1–20 defined in the Correctness Properties section is implemented as a property-based test. The backend properties (1–3, 9, 20) use a Prisma mock client to avoid real database calls in unit tests; integration tests with a test MySQL database cover end-to-end persistence.

Generators will produce:

- **Transactions**: random positive integer paise within the supported transaction range, serialized as a canonical INR decimal string; `type` ('Income'|'Expense'), `category` (alphanumeric string), `date` (past ISO dates), optional `note` (unicode string up to 300 chars)
- **Category lists**: arrays of `Category` objects with unique or intentionally duplicate names
- **Transaction arrays**: arrays of 0–100 transactions with varied dates across periods
- **Filter criteria**: randomly combined type, category set, and date range values
- **Note strings**: strings of arbitrary Unicode content with varying lengths (0–500 chars)

### Test File Organization

```
frontend/                                  # Angular project
├── src/
│   ├── app/
│   │   ├── services/
│   │   │   ├── transaction-api.service.spec.ts   # unit + property tests
│   │   │   ├── category-api.service.spec.ts
│   │   │   └── summary-api.service.spec.ts
│   │   └── components/
│   │       └── **/*.spec.ts              # Angular TestBed component tests

backend/                                   # NestJS project
├── src/
│   ├── validator/
│   │   ├── validator.service.ts
│   │   └── validator.service.spec.ts     # unit + property tests (Properties 4–8, 18)
│   ├── summarizer/
│   │   ├── summarizer.service.ts
│   │   └── summarizer.service.spec.ts    # unit + property tests (Properties 11–14)
│   ├── filter-engine/
│   │   ├── filter-engine.service.ts
│   │   └── filter-engine.service.spec.ts # unit + property tests (Properties 15–17, 19)
│   ├── transactions/
│   │   ├── transactions.repository.ts
│   │   └── transactions.repository.spec.ts # unit + property tests (Properties 1–3, 20)
│   └── categories/
│       ├── categories.repository.ts
│       └── categories.repository.spec.ts  # unit + property tests (Properties 9–10)
└── test/
    └── app.e2e-spec.ts                    # end-to-end tests against test MySQL database
```

