# Product and deployment decisions

**Status:** Adopted 2026-10-21. These decisions are the baseline for schema, API, and local-readiness work.

## Persistence: MySQL

MySQL is the sole source of truth for transactions and categories. This matches the existing NestJS/Prisma design and supports server-side summaries and a deliberate backup/restore process. Browser local storage is not authoritative; it would make records device-bound, create a separate export/recovery obligation, and require replacing the API-backed flows. A hybrid model is deferred because synchronization and conflict handling add complexity without an initial-product need.

## Access: single owner, local-only until authenticated

The initial product serves one owner; multi-account support is out of scope. The API and database remain local-only until authentication and owner authorization are implemented and verified. The API must bind to loopback for a host process; Compose may bind inside its private service network, but published API/database ports must bind to host loopback only. CORS is not authentication. Before any network exposure, require TLS, a verified authentication mechanism, and server-side owner authorization on every read and write.

Single-owner access reduces ownership and account-lifecycle complexity. It does not remove the need for authentication before network access. Multiple accounts would require ownership relations on every financial entity, isolation on every query and mutation, account recovery, and dedicated cross-account security tests; defer that work unless the product scope changes.

## Currency and exact representation: INR, two decimal places

Support INR only, with exactly two fractional digits (paise). Store each transaction amount in MySQL `DECIMAL(15,2)` and map it to Prisma `Decimal`. This avoids binary floating-point approximation while keeping two fractional digits in the database. The largest positive transaction amount is ₹9,999,999,999,999.99; reject values outside that range and reject excess precision instead of silently rounding.

The JSON API uses canonical decimal strings such as `"1234.50"` for transaction amounts and all monetary summary fields. JavaScript `number` is not used for parsing, arithmetic, or serialization of money. Backend aggregation uses exact decimal arithmetic; the Angular client treats monetary values as strings and passes them to formatting without first converting to a number. This contract avoids JSON's lack of a native decimal type and preserves paise across the API boundary. Summary totals may exceed the per-transaction column range and must remain exact strings without being written back into the transaction column.

## Deployment: deferred

Lightsail deployment is deferred until the application works end to end and the security, migration, CI, staging, backup, and rollback checks are complete. Any eventual production release remains a separate approval checkpoint. No deployment workflow should publish automatically from CI.

## Migration consequence

The first migration must use the selected MySQL model and `DECIMAL(15,2)` amount column. Validate it on a disposable database, verify fresh schema creation and seed behavior, and review the SQL before treating it as ready. Never run it against a persistent or production database as part of this local implementation work.
