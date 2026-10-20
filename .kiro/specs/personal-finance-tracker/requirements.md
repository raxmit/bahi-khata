# Requirements Document

## Introduction

The Personal Finance Tracker is a responsive web application that enables individuals to manage their personal finances by recording daily income and expense entries, categorizing transactions, and gaining actionable insights through periodic summaries and filtered reports. The app targets users who want a straightforward, structured way to understand their spending patterns and income sources over time.

## Glossary

- **Transaction**: A single financial record representing either an income or an expense.
- **Entry**: Synonymous with Transaction — a user-submitted record with an amount, category, type, date, and optional note.
- **Category**: A user-defined or system-provided label grouping similar transactions (e.g., "Food", "Salary", "Rent").
- **Type**: The high-level classification of a transaction — either `Income` or `Expense`.
- **Period**: A span of time used for summarization — one of `weekly`, `monthly`, or `yearly`.
- **Summary**: An aggregated view of transactions over a defined Period, including totals, breakdowns by category, and net balance.
- **Filter**: A set of user-selected criteria (type, category, date range) used to narrow down the displayed transactions.
- **Dashboard**: The main view of the application presenting the current period's summary and quick-entry access.
- **App**: The Personal Finance Tracker web application.
- **User**: The single owner of the initial product. Any network access requires implemented and verified authentication and owner authorization.
- **Validator**: The App subsystem responsible for checking input correctness before persisting data.
- **Repository**: The App subsystem responsible for persisting and retrieving transactions.
- **Summarizer**: The App subsystem responsible for computing aggregated insights from stored transactions.
- **Filter_Engine**: The App subsystem responsible for applying user-defined filters to retrieve matching transactions.

---

## Requirements

### Requirement 1: Transaction Entry

**User Story:** As a User, I want to record daily income and expense transactions, so that I have a complete and accurate financial log.

#### Acceptance Criteria

1. WHEN a User submits a new transaction with a valid positive INR amount (at most two fractional digits), type, category, and date, THE App SHALL persist the transaction and display it in the transaction list immediately.
2. WHEN a User submits a transaction with a missing required field (amount, type, category, or date), THE Validator SHALL reject the submission and display a descriptive error message identifying the missing field.
3. WHEN a User submits a transaction with an amount less than or equal to zero or more than two fractional digits, THE Validator SHALL reject the submission and display a descriptive amount error.
4. WHEN a User submits a transaction with a date in the future, THE Validator SHALL reject the submission and display an error indicating the date must not be in the future.
5. THE App SHALL allow the User to optionally attach a text note of up to 250 characters to any transaction.
6. IF a note exceeds 250 characters, THEN THE Validator SHALL truncate the note to 250 characters and notify the User.
7. WHEN a User edits an existing transaction and submits valid changes, THE Repository SHALL update the stored record and reflect the changes immediately in the transaction list.
8. WHEN a User deletes a transaction, THE Repository SHALL permanently remove the record and update the transaction list.

---

### Requirement 2: Category Management

**User Story:** As a User, I want to organize transactions by category, so that I can understand where my money comes from and goes.

#### Acceptance Criteria

1. THE App SHALL provide a set of default categories for both income (e.g., "Salary", "Freelance", "Investment", "Gift") and expense (e.g., "Food", "Rent", "Transport", "Healthcare", "Entertainment", "Utilities").
2. WHEN a User creates a new custom category with a unique name and a valid type (Income or Expense), THE Repository SHALL persist the category and make it available for transaction entry.
3. WHEN a User attempts to create a category with a name that already exists for the same type, THE Validator SHALL reject the creation and display an error indicating the category name must be unique per type.
4. WHEN a User deletes a custom category, THE App SHALL prompt the User to reassign or retain existing transactions linked to that category before completing the deletion.
5. THE App SHALL display categories sorted alphabetically within each type on all selection interfaces.

---

### Requirement 3: Periodic Insights and Summaries

**User Story:** As a User, I want to view weekly, monthly, and yearly financial summaries, so that I can understand my financial patterns over time.

#### Acceptance Criteria

1. WHEN a User selects a Period (weekly, monthly, or yearly), THE Summarizer SHALL compute and display the total income, total expenses, and net balance for that Period.
2. WHEN a User views a summary for a selected Period, THE Summarizer SHALL display a breakdown of totals grouped by category, sorted by amount in descending order.
3. WHEN a User navigates to a prior or future Period (e.g., previous month, next week), THE Summarizer SHALL compute and display the summary for that specific Period.
4. IF no transactions exist for a selected Period, THEN THE Summarizer SHALL display a zero-balance summary with a message indicating no transactions were recorded, regardless of whether the computed net balance would be zero.
5. THE Summarizer SHALL display the net balance as positive when income exceeds expenses and as negative when expenses exceed income for the selected Period.
6. WHEN a User views a monthly summary, THE Summarizer SHALL display a week-by-week breakdown within that month independently of whether the monthly summary totals are available.

---

### Requirement 4: Transaction Filtering

**User Story:** As a User, I want to filter transactions by category, type, or date range, so that I can analyze specific kinds of income or expenses over any period.

#### Acceptance Criteria

1. WHEN a User applies a filter specifying a type (Income or Expense), THE Filter_Engine SHALL return only transactions matching that type.
2. WHEN a User applies a filter specifying one or more categories, THE Filter_Engine SHALL return only transactions whose category matches one of the selected categories.
3. WHEN a User applies a filter specifying a date range (start date and end date), THE Filter_Engine SHALL return only transactions whose date falls within the range, inclusive of both endpoints.
4. WHEN a User applies multiple filter criteria simultaneously, THE Filter_Engine SHALL return only transactions that satisfy all specified criteria.
5. IF no transactions match the applied filters, THEN THE Filter_Engine SHALL display a message indicating no results were found for the selected criteria alongside the full unfiltered transaction list.
6. WHEN a User clears all active filters, THE App SHALL display the full unfiltered transaction list.
7. WHEN a User applies a filter with a start date later than the end date, THE Validator SHALL reject the filter and display an error indicating the date range is invalid.

---

### Requirement 5: Dashboard and Navigation

**User Story:** As a User, I want a clear and responsive dashboard, so that I can quickly see my financial status and navigate the app on any device.

#### Acceptance Criteria

1. WHEN the User opens the App, THE Dashboard SHALL display the current month's total income, total expenses, and net balance.
2. THE App SHALL be fully functional and readable on screen widths from 320px to 2560px without horizontal scrolling or content overflow.
3. WHEN a User navigates between sections (Dashboard, Transactions, Insights, Categories), THE App SHALL render the selected section within 500ms.
4. THE Dashboard SHALL display the five most recent transactions regardless of the current Period filter.
5. WHEN the App is used on a screen with a width below 768px, THE App SHALL display a bottom navigation bar instead of a side navigation panel, based solely on screen width.

---

### Requirement 6: Data Persistence

**User Story:** As a User, I want my financial data to be reliably stored, so that I do not lose records between sessions.

#### Acceptance Criteria

1. WHEN a transaction is successfully created or updated, THE Repository SHALL persist the data to the storage layer within 1 second; IF the storage operation times out, THEN THE App SHALL treat the timeout as a failure and follow the error handling defined in AC4.
2. WHEN the User reopens the App after closing it, THE App SHALL restore all transactions that were successfully persisted to storage, even if some recent transactions were not persisted due to prior storage errors.
3. THE Repository SHALL persist transactions and categories in MySQL. Browser local storage SHALL NOT be the source of truth for financial records.
4. WHEN the storage layer encounters an error during a write operation, THE App SHALL display an error message and retain the unsaved entry in the form for the User to retry.

5. THE API SHALL remain accessible only from the local machine until authentication and owner authorization are implemented and verified. CORS configuration alone SHALL NOT be treated as an access-control boundary.

---

### Requirement 7: Input Validation and Error Handling

**User Story:** As a User, I want clear feedback when I enter invalid data, so that I can correct mistakes without losing my progress.

#### Acceptance Criteria

1. WHEN a User submits any form with invalid data, THE Validator SHALL highlight each invalid field and display a specific, actionable error message adjacent to the field.
2. THE Validator SHALL perform validation on the client side before any data is sent to the storage layer.
3. WHEN the App encounters an unexpected runtime error, THE App SHALL display a user-friendly error message and log the error details to the browser console without crashing.
4. THE App SHALL provide the User with an option to reset the storage to a clean state at any time; IF the App detects corrupted or unreadable data in storage, THEN THE App SHALL additionally display a warning message prompting the User to consider the reset option.

---

### Requirement 8: Currency and Exact Amounts

**User Story:** As the owner, I want INR amounts to retain exact paise precision, so that transaction values and summaries do not drift through rounding.

#### Acceptance Criteria

1. THE App SHALL support INR only for the initial product and SHALL accept no more than two fractional digits.
2. THE Repository SHALL store transaction amounts in an exact MySQL decimal column with two fractional digits; binary floating-point types SHALL NOT be used for persisted amounts or financial totals.
3. THE API SHALL accept and return money as canonical decimal strings with exactly two fractional digits (for example, `"1234.50"`). It SHALL NOT serialize money through JavaScript binary floating-point numbers.
4. THE Summarizer SHALL compute income, expense, category, weekly, and net totals with exact decimal arithmetic and return canonical decimal strings.
