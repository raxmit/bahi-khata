# Implementation Plan: Personal Finance Tracker

> **Adopted scope update (2026-10-21):** MySQL is the sole persistence source; the initial product is single-owner; the API remains local-only until authentication and owner authorization are implemented and verified; currency is INR with exact two-decimal storage (`DECIMAL(15,2)`) and decimal-string JSON values. Historical browser-local-storage, binary-float, multi-account, or deploy-on-push task text is superseded. Lightsail deployment is deferred until end-to-end, security, migration, CI, staging, backup, and rollback gates pass and the user separately approves a release. Do not deploy or push as part of these tasks.

## Overview

Implement the Personal Finance Tracker as a full-stack monorepo with an Angular 21 SPA frontend, a NestJS 12 REST API backend, Prisma ORM, and MySQL on AWS Lightsail. Stack is Node.js 24.x compatible. Tasks are ordered to build shared types and infrastructure first, then Docker local dev environment, then backend business logic, then REST controllers, then Angular services, then UI components, and finally wiring and CI/CD.

## Tasks

- [ ] 1. Initialize monorepo structure and shared types
  - Create the root `bahi-khata/` monorepo with `frontend/` and `backend/` directories
  - Run `ng new frontend --routing --style=css` to scaffold the Angular 21 project (use `npx @angular/cli@21 new frontend --routing --style=css --skip-git --no-interactive`)
  - Run `nest new backend` to scaffold the NestJS 12 project (use `npx @nestjs/cli new backend --package-manager npm --skip-git`)
  - Add `date-fns` and `fast-check` to backend dependencies; add `date-fns` to frontend dependencies
  - Create `backend/src/common/types.ts` defining `TransactionType`, `Period`, `Transaction`, `Category`, `PeriodSummary`, `CategoryTotal`, `WeeklyBreakdown`, `FilterCriteria`, `FilterResult`, `ValidationResult`
  - _Requirements: 1.1, 2.1, 3.1, 4.1_


- [ ] 2. Set up Docker local development environment
  - [ ] 2.1 Create `backend/Dockerfile.dev`
    - Base image: `node:20-alpine`
    - `WORKDIR /app`, `COPY package*.json ./`, `RUN npm ci`, `COPY . .`
    - Run `npx prisma generate` as part of the image build step
    - `EXPOSE 3000`; default `CMD ["npm", "run", "start:dev"]` for NestJS hot-reload via ts-node watch
    - _Requirements: 6.1, 6.2_

  - [ ] 2.2 Create `frontend/Dockerfile.dev`
    - Base image: `node:20-alpine`
    - `WORKDIR /app`, `COPY package*.json ./`, `RUN npm ci`, `COPY . .`
    - `EXPOSE 4200`; default `CMD ["ng", "serve", "--host", "0.0.0.0", "--poll", "2000"]`
    - _Requirements: 5.2_

  - [ ] 2.3 Create `docker-compose.yml` for the full local dev stack
    - Define three services exactly as specified in the design:
      - `mysql` — `mysql:8.0`, env vars `MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`, port `3306:3306`, named volume `mysql_data`, healthcheck via `mysqladmin ping`
      - `backend` — built from `./backend/Dockerfile.dev`, port `3000:3000`, env `DATABASE_URL=mysql://pfuser:pfpass@mysql:3306/pftracker`, `CORS_ORIGIN=http://localhost:4200`, source volume mount `./backend:/app` with anonymous `/app/node_modules`, `depends_on: mysql` with `condition: service_healthy`
      - `frontend` — built from `./frontend/Dockerfile.dev`, port `4200:4200`, `CHOKIDAR_USEPOLLING=true`, source volume mount `./frontend:/app` with anonymous `/app/node_modules`, `depends_on: backend`
    - Declare the `mysql_data` named volume at the top-level `volumes` key
    - _Requirements: 6.1_

  - [ ] 2.4 Create `docker-compose.test.yml` with isolated test database
    - Define a single `mysql-test` service using `mysql:8.0` on port `3307:3306`
    - Use `tmpfs: /var/lib/mysql` so the test database is in-memory and data is lost on stop
    - Set `MYSQL_DATABASE: pftracker_test`; include healthcheck with shorter intervals (`interval: 5s`, `retries: 10`)
    - _Requirements: 6.1, 6.2_

  - [ ] 2.5 Create `.env.docker.example` and update `.gitignore`
    - Create `.env.docker.example` committed to the repo with placeholder values: `DATABASE_URL`, `PORT`, `CORS_ORIGIN`, `NODE_ENV`
    - Add `.env.docker` (but not `.env.docker.example`) to `.gitignore`
    - _Requirements: 6.1_

  - [ ] 2.6 Verify full stack starts with `docker compose up`
    - Run `docker compose up --build` and confirm all three containers reach healthy/running state
    - Confirm frontend is reachable at `http://localhost:4200`, backend at `http://localhost:3000`, and MySQL accepts connections on `localhost:3306`
    - _Requirements: 6.1, 6.2_


- [ ] 3. Set up Prisma schema and database seed
  - [ ] 3.1 Configure Prisma with MySQL and define schema
    - Add `prisma` and `@prisma/client` to `backend/`
    - Write `backend/prisma/schema.prisma` with `Transaction` and `Category` models and `TransactionType` enum exactly as specified in the design
    - Configure `DATABASE_URL` env variable and create `.env.example`
    - Run `npx prisma migrate dev --name init` to generate the initial migration
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ] 3.2 Write Prisma seed script for default categories
    - Write `backend/prisma/seed.ts` that upserts all 10 default categories (Income: Salary, Freelance, Investment, Gift; Expense: Food, Rent, Transport, Healthcare, Entertainment, Utilities) with `isDefault: true`
    - Register seed script in `backend/package.json` under `prisma.seed`
    - _Requirements: 2.1_


- [ ] 4. Implement NestJS DTOs and ValidatorService
  - [ ] 4.1 Create DTOs with class-validator decorators
    - Write `CreateTransactionDto`, `UpdateTransactionDto`, `CreateCategoryDto`, `FilterCriteriaDto` in `backend/src/common/dto/` using `class-validator` decorators exactly as defined in the design
    - Enable `ValidationPipe` globally in `main.ts`
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 2.3, 4.7_

  - [ ] 4.2 Implement ValidatorService business logic
    - Write `backend/src/validator/validator.service.ts` implementing `validateTransaction()`, `validateCategory()`, `validateFilter()`, and `truncateNote()`
    - Enforce: amount > 0, date not in future, all required fields present, note truncated at 250 chars, category name unique per type, startDate ≤ endDate
    - _Requirements: 1.2, 1.3, 1.4, 1.6, 2.3, 4.7_

  - [ ]* 4.3 Write property tests for ValidatorService
    - **Property 4: Non-Positive Amounts Are Rejected** — use `fc.float({ max: 0 })` to generate non-positive amounts and assert `valid === false` with `amount` error key
    - **Property 5: Future Dates Are Rejected** — use `fc.date({ min: tomorrow })` to generate future dates and assert `valid === false` with `date` error key
    - **Property 6: Missing Required Fields Are Rejected** — use `fc.subarray(['amount','type','category','date'])` to remove fields and assert each removed field appears in `errors`
    - **Property 7: Note Truncation Invariant** — use `fc.string({ minLength: 251 })` and assert `value.length === 250` and `truncated === true`
    - **Property 8: Category Uniqueness Enforcement** — generate existing category list and matching input; assert `valid === false`
    - **Property 18: Invalid Date Range Is Rejected** — generate `startDate > endDate` pairs; assert `valid === false`
    - _Requirements: 1.2, 1.3, 1.4, 1.6, 2.3, 4.7_


- [ ] 5. Implement TransactionRepository and CategoryRepository
  - [ ] 5.1 Implement TransactionRepository wrapping Prisma
    - Write `backend/src/transactions/transaction.repository.ts` implementing `create()`, `update()`, `delete()`, `findAll()`, `findById()` using the Prisma client
    - Map Prisma `PrismaClientKnownRequestError` and timeout errors to domain exceptions
    - _Requirements: 1.1, 1.7, 1.8, 6.1, 6.2_

  - [ ] 5.2 Implement CategoryRepository wrapping Prisma
    - Write `backend/src/categories/category.repository.ts` implementing `create()`, `delete()`, `findAll()`, `findByNameAndType()`
    - Enforce `isDefault` guard in `delete()` — throw `ForbiddenException` when `isDefault === true`
    - _Requirements: 2.2, 2.3, 2.4_

  - [ ]* 5.3 Write property tests for TransactionRepository
    - **Property 20: Storage Persistence Round-Trip** — generate valid `CreateTransactionDto` with `fc.record(...)`, write via `create()`, read back with `findById()`, assert structural equivalence
    - Use an in-memory SQLite test database or Jest mocks for Prisma client
    - _Requirements: 6.2, 6.3_


- [ ] 6. Implement SummarizerService
  - [ ] 6.1 Implement SummarizerService core logic
    - Write `backend/src/summary/summarizer.service.ts` implementing `summarize()` and `getWeeklyBreakdown()` using `date-fns` for period boundary calculation
    - `summarize()` computes `totalIncome`, `totalExpenses`, `netBalance = totalIncome - totalExpenses`, `categoryBreakdown` sorted descending by total, and sets `isEmpty` when no transactions fall in the period
    - `getWeeklyBreakdown()` partitions transactions into ISO week buckets within the given calendar month
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ]* 6.2 Write property tests for SummarizerService
    - **Property 11: Summary Net Balance Arithmetic** — use `fc.array(fc.record({amount: fc.float({min:0.01}), type: fc.constantFrom('Income','Expense'), ...}))` and assert `netBalance === totalIncome - totalExpenses`
    - **Property 12: Summary Period Boundary Correctness** — generate transactions spanning multiple periods; assert only in-window transactions contribute to totals
    - **Property 13: Category Breakdown Descending Order** — generate arbitrary transaction arrays; assert `categoryBreakdown` is sorted `total[i] >= total[i+1]` for all i
    - **Property 14: Weekly Breakdown Partitioning** — generate transactions within one calendar month; assert each transaction appears in exactly one week bucket and sum of bucket totals equals monthly totals
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_


- [ ] 7. Implement FilterEngineService and getRecentTransactions helper
  - [ ] 7.1 Implement FilterEngineService
    - Write `backend/src/filter/filter-engine.service.ts` implementing `applyFilter()` with AND-conjunction logic for type, categories, and date-range criteria
    - Return `{ matches, hasResults }` where `hasResults = matches.length > 0`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ] 7.2 Implement `getRecentTransactions` utility
    - Write `backend/src/common/utils/recent-transactions.ts` exporting `getRecentTransactions(transactions: Transaction[], limit: number): Transaction[]`
    - Sort by `date` descending, then `createdAt` descending for ties; return first `Math.min(limit, transactions.length)` entries
    - _Requirements: 5.4_

  - [ ]* 7.3 Write property tests for FilterEngineService and getRecentTransactions
    - **Property 15: Single-Criterion Filter Correctness** — generate one active criterion at a time and assert every returned transaction satisfies it
    - **Property 16: Multi-Criterion Filter Conjunction** — generate multiple active criteria and assert every returned transaction satisfies all criteria simultaneously
    - **Property 17: Empty Criteria Returns All Transactions** — pass `{}` criteria and assert all input transactions are returned unchanged
    - **Property 19: Recent Transactions Selection** — use `fc.array(transactionArb)` and assert result length equals `Math.min(5, input.length)` and all returned transactions have the most recent dates
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6, 5.4_


- [ ] 8. Checkpoint — Backend services complete
  - Ensure all Jest unit and property-based tests pass. Run `npm run test` in `backend/`. Ask the user if questions arise before proceeding to REST controllers.

- [ ] 9. Implement NestJS REST controllers and wire backend modules
  - [ ] 9.1 Implement TransactionsController and TransactionsModule
    - Write `backend/src/transactions/transactions.controller.ts` with `GET /transactions`, `POST /transactions`, `PATCH /transactions/:id`, `DELETE /transactions/:id`
    - Inject `ValidatorService`, `TransactionRepository`, and `FilterEngineService`; apply `ValidationPipe` on all mutation endpoints
    - Wire `TransactionsModule` in `AppModule`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.7, 1.8, 4.1, 4.2, 4.3, 4.4_

  - [ ]* 9.2 Write property tests for transaction API round-trips
    - **Property 1: Transaction Persistence Round-Trip** — use NestJS `supertest` + `fc.record(...)` to POST valid transactions and assert `GET /transactions` contains them
    - **Property 2: Transaction Update Preserves Identity** — PATCH a transaction and assert `id` is unchanged and fields are updated
    - **Property 3: Transaction Deletion Removes Record** — DELETE a transaction and assert it no longer appears in `GET /transactions`
    - _Requirements: 1.1, 1.7, 1.8_

  - [ ] 9.3 Implement CategoriesController and CategoriesModule
    - Write `backend/src/categories/categories.controller.ts` with `GET /categories`, `POST /categories`, `DELETE /categories/:id`
    - Return categories sorted alphabetically within each type (use sort helper from `FilterEngineService` or a dedicated utility)
    - Block deletion of default categories with `403 Forbidden`; handle duplicate name+type with `409 Conflict`
    - Wire `CategoriesModule` in `AppModule`
    - _Requirements: 2.2, 2.3, 2.4, 2.5_

  - [ ]* 9.4 Write property tests for category API round-trips
    - **Property 9: Category Save Round-Trip** — POST unique category names and assert `GET /categories` contains them
    - **Property 10: Category Alphabetical Sort Invariant** — generate arbitrary category arrays, call the sort function, assert ascending order within each type
    - _Requirements: 2.2, 2.5_

  - [ ] 9.5 Implement SummaryController and SummaryModule
    - Write `backend/src/summary/summary.controller.ts` with `GET /summary` and `GET /summary/weekly`
    - Accept `period` and `date` query params; delegate to `SummarizerService` and `TransactionRepository`
    - Wire `SummaryModule` in `AppModule`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ] 9.6 Implement global exception filter and CORS configuration
    - Write `AllExceptionsFilter` mapping Prisma errors, domain exceptions, and unknown errors to appropriate HTTP responses as defined in the design error-handling table
    - Configure CORS in `main.ts` to allow only `CORS_ORIGIN` env variable value
    - _Requirements: 7.3, 6.4_


- [ ] 10. Checkpoint — Backend REST API complete
  - Run `npm run test` in `backend/` and verify all tests pass. Manually smoke-test endpoints with a REST client if needed. Ask the user if questions arise.

- [ ] 11. Implement Angular core infrastructure (app shell, routing, state, HTTP services)
  - [ ] 11.1 Configure Angular app shell, router, and global styles
    - Set up routing with lazy-loaded routes for Dashboard, Transactions, Insights, and Categories (Angular 21 uses standalone components + `provideRouter` by default)
    - Add CSS custom properties and global responsive base styles in `styles.css` targeting 320px–2560px
    - _Requirements: 5.2, 5.3_

  - [ ] 11.2 Implement AppStateService (global BehaviorSubject state)
    - Write `frontend/src/app/core/app-state.service.ts` holding `transactions$`, `categories$`, and `currentPeriod$` as `BehaviorSubject` streams
    - Expose methods to refresh state after mutation operations
    - _Requirements: 1.1, 1.7, 1.8, 2.2_

  - [ ] 11.3 Implement Angular HTTP API services
    - Write `TransactionApiService`, `CategoryApiService`, and `SummaryApiService` in `frontend/src/app/core/services/` with typed `HttpClient` calls matching the REST API endpoints defined in the design
    - _Requirements: 1.1, 1.7, 1.8, 2.2, 3.1, 3.6, 4.1_

  - [ ] 11.4 Implement HTTP error interceptor and global Angular ErrorHandler
    - Write `ErrorHandlerInterceptor` that maps 400/404/409/500 responses and network failures to toast notifications and retains unsaved form data on failure
    - Write a global `AppErrorHandler` extending Angular's `ErrorHandler` that logs to `console.error` and shows a user-friendly toast without crashing
    - _Requirements: 6.4, 7.1, 7.3_

  - [ ]* 11.5 Write unit tests for Angular HTTP services
    - Use `HttpClientTestingModule` to mock HTTP responses; test that each service method maps response bodies to the correct typed objects
    - Test error interceptor maps 500 to toast and retains form data
    - _Requirements: 1.1, 6.4, 7.3_


- [ ] 12. Implement NavbarComponent (responsive navigation)
  - Write `NavbarComponent` that renders a side navigation panel when screen width ≥ 768px and a bottom navigation bar when < 768px using CSS media queries and Angular `HostListener` for width detection
  - Include navigation links to Dashboard, Transactions, Insights, and Categories
  - _Requirements: 5.2, 5.5_

- [ ] 13. Implement transaction form components and reactive validation
  - [ ] 13.1 Implement QuickEntryFormComponent (reactive form)
    - Write `QuickEntryFormComponent` using Angular `ReactiveFormsModule` with controls for amount, type, category (filtered by selected type), date, and note
    - Add synchronous validators: amount > 0, date not in future, required fields, note character-count indicator that truncates at 250 and shows truncation notification
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 7.1, 7.2_

  - [ ] 13.2 Implement inline transaction editing in TransactionItemComponent
    - Write `TransactionItemComponent` with edit and delete action buttons
    - Edit action opens an inline form pre-populated with existing transaction data; delete triggers a confirmation dialog before calling `TransactionApiService.delete()`
    - _Requirements: 1.7, 1.8_

  - [ ]* 13.3 Write unit tests for transaction form validation
    - Test that each required field shows the correct error message when blank
    - Test that amount ≤ 0 shows amount error; future date shows date error; note > 250 chars is truncated and user is notified
    - _Requirements: 1.2, 1.3, 1.4, 1.6, 7.1, 7.2_


- [ ] 14. Implement DashboardComponent and child components
  - [ ] 14.1 Implement DashboardComponent and SummaryCardComponent
    - Write `DashboardComponent` that on init loads the current month summary via `SummaryApiService.getSummary('monthly', today)` and renders it in `SummaryCardComponent`
    - `SummaryCardComponent` displays total income, total expenses, and net balance; shows net balance as positive or negative accordingly
    - _Requirements: 5.1, 3.5_

  - [ ] 14.2 Implement RecentTransactionsListComponent
    - Write `RecentTransactionsListComponent` that receives the full transaction list and displays the 5 most recent entries (sorted by date desc, then createdAt desc for ties) regardless of any active period filter
    - _Requirements: 5.4_

  - [ ]* 14.3 Write unit tests for DashboardComponent
    - Mock `SummaryApiService` and assert summary card shows correct totals
    - Assert recent transactions list shows exactly 5 (or fewer if less than 5 exist) and they are the most recent
    - _Requirements: 5.1, 5.4_

- [ ] 15. Implement TransactionsComponent with filter panel
  - [ ] 15.1 Implement FilterPanelComponent and sub-filter components
    - Write `FilterPanelComponent` containing `TypeFilterComponent` (radio/toggle), `CategoryFilterComponent` (multi-select checkboxes), and `DateRangeFilterComponent` (date picker pair)
    - Validate that start date ≤ end date in `DateRangeFilterComponent`; show inline error if violated
    - Emit combined `FilterCriteria` to `TransactionsComponent` on change
    - _Requirements: 4.1, 4.2, 4.3, 4.7_

  - [ ] 15.2 Implement TransactionListComponent with filter integration
    - Write `TransactionListComponent` that calls `TransactionApiService.getAll(filter)` with the current `FilterCriteria` and renders `TransactionItemComponent` for each result
    - Show "no results" message when `hasResults === false`; show "clear filters" action to restore full list
    - _Requirements: 4.4, 4.5, 4.6_

  - [ ]* 15.3 Write unit tests for filter panel validation
    - Test that start date > end date shows an error and does not emit filter criteria
    - Test that clearing filters resets the list to all transactions
    - _Requirements: 4.6, 4.7_


- [ ] 16. Implement InsightsComponent and period navigation
  - [ ] 16.1 Implement InsightsComponent with PeriodSelectorComponent and PeriodNavigatorComponent
    - Write `InsightsComponent` hosting `PeriodSelectorComponent` (weekly/monthly/yearly toggle) and `PeriodNavigatorComponent` (prev/next arrows that shift the reference date by one period)
    - On period or date change, call `SummaryApiService.getSummary()` and update the view; show zero-balance summary with "no transactions" message when `isEmpty === true`
    - _Requirements: 3.1, 3.3, 3.4, 3.5_

  - [ ] 16.2 Implement CategoryBreakdownListComponent and WeeklyBreakdownTableComponent
    - Write `CategoryBreakdownListComponent` rendering categories sorted descending by total from `PeriodSummary.categoryBreakdown`
    - Write `WeeklyBreakdownTableComponent` that is shown only when `period === 'monthly'` and calls `SummaryApiService.getWeeklyBreakdown()` independently
    - _Requirements: 3.2, 3.6_

  - [ ]* 16.3 Write unit tests for InsightsComponent
    - Mock `SummaryApiService`; assert zero-balance message shown when `isEmpty === true`
    - Assert `WeeklyBreakdownTableComponent` is only rendered for monthly period
    - _Requirements: 3.4, 3.6_

- [ ] 17. Implement CategoriesComponent with category management
  - [ ] 17.1 Implement CategoriesComponent and AddCategoryFormComponent
    - Write `CategoriesComponent` with two `CategoryListComponent` instances (one for Income, one for Expense) each rendering categories alphabetically
    - Write `AddCategoryFormComponent` with name and type fields; validate uniqueness after API 409 response and display "Category name must be unique per type" error
    - Handle category deletion: show reassignment prompt before calling `CategoryApiService.delete()`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 17.2 Write unit tests for CategoriesComponent
    - Test that categories are rendered in alphabetical order within each type
    - Test that attempting to delete a default category is blocked (403 response maps to user message)
    - Test that duplicate category name triggers correct error display
    - _Requirements: 2.3, 2.4, 2.5_


- [ ] 18. Implement storage reset and error recovery features
  - Write a "Reset Storage" button accessible from a Settings or footer area that calls a `DELETE /transactions/all` endpoint (or directly clears via a dedicated backend endpoint) after user confirmation
  - On app startup, detect corrupted/unreadable responses (non-2xx from initial data fetch) and display a warning prompting the user to consider resetting storage
  - _Requirements: 7.4_

- [ ] 19. Checkpoint — Frontend implementation complete
  - Run `ng test --watch=false --browsers=ChromeHeadless` in `frontend/` and verify all Karma/Jasmine tests pass. Ask the user if questions arise before setting up CI/CD.

- [ ] 20. Configure GitHub Actions CI/CD pipelines
  - > **Note:** Both CI/CD pipelines run tests and builds natively on the GitHub Actions runner (Ubuntu) using the Node.js 20 setup action — they do **not** use Docker or `docker compose`. Docker Compose is strictly for local developer workflows.

  - [ ] 20.1 Write frontend CI/CD workflow
    - Write `.github/workflows/frontend.yml` triggered on push to `main` with changes under `frontend/**`
    - Steps: checkout → Node.js 20 setup (`actions/setup-node@v4`) → `npm ci` → `ng test --watch=false --browsers=ChromeHeadless` → `ng build --configuration production` → SCP `dist/` to Lightsail frontend instance → SSH nginx reload
    - _Requirements: 6.1_

  - [ ] 20.2 Write backend CI/CD workflow
    - Write `.github/workflows/backend.yml` triggered on push to `main` with changes under `backend/**`
    - Steps: checkout → Node.js 20 setup (`actions/setup-node@v4`) → `npm ci` → `npm run test` → SSH: git pull + `npm ci --omit=dev` + `npx prisma migrate deploy` + `pm2 reload pf-tracker-api`
    - Document required GitHub Secrets: `LIGHTSAIL_FRONTEND_HOST`, `LIGHTSAIL_BACKEND_HOST`, `LIGHTSAIL_SSH_KEY`, `LIGHTSAIL_SSH_USER`, `DATABASE_URL`
    - _Requirements: 6.1, 6.2_

- [ ] 21. Final checkpoint — All tests pass end-to-end
  - Run `npm run test` in `backend/` and `ng test --watch=false` in `frontend/`. Verify the full test suite is green. Ask the user if questions arise.


## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP. All property-based and unit test sub-tasks are optional.
- Each task references specific requirements for traceability.
- Checkpoints (tasks 8, 10, 19, 21) ensure incremental validation before moving to the next layer.
- The design uses TypeScript throughout (Angular 17 + NestJS); all code examples follow that stack.
- Property tests use `fast-check` running under Jest (backend) and Karma/Jasmine (frontend).
- Backend tests should mock or stub the Prisma client using Jest mocks or `prisma-mock` to avoid requiring a live database in CI.
- Docker Compose is for local development only. GitHub Actions CI/CD runs natively on the Ubuntu runner using `actions/setup-node` — no Docker daemon is needed in CI.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "2.2", "3.1", "11.1"] },
    { "id": 1, "tasks": ["2.3", "2.4", "2.5", "3.2", "4.1", "11.2", "11.3", "11.4"] },
    { "id": 2, "tasks": ["2.6", "4.2", "5.1", "5.2", "11.5"] },
    { "id": 3, "tasks": ["4.3", "5.3", "6.1", "7.1", "7.2", "13.1", "13.2"] },
    { "id": 4, "tasks": ["6.2", "7.3", "9.1", "13.3", "14.1", "14.2", "15.1", "17.1"] },
    { "id": 5, "tasks": ["9.2", "9.3", "14.3", "15.2", "16.1", "17.2"] },
    { "id": 6, "tasks": ["9.4", "9.5", "15.3", "16.2"] },
    { "id": 7, "tasks": ["9.6", "16.3", "18"] },
    { "id": 8, "tasks": ["20.1", "20.2"] }
  ]
}
```
