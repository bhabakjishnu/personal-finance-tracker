# Personal Finance Tracker 💎

A sleek, responsive, and high-precision personal finance tracking web application. Calculates all running totals, net balances, category distributions, and metrics **strictly using `Array.prototype.reduce()` and `Array.prototype.filter()`**, with persistent synchronization to `localStorage`.

---

## 🌟 Key Features

- **Strictly Functional Aggregate Engine**:
  - Net balance, total income, total expenses, savings rate %, and category breakdowns are calculated solely with `reduce()` and `filter()`.
  - Sequential running balances per transaction are calculated using an accumulator in `reduce()` across chronologically ordered entries.
  - Floating-point arithmetic guarded with `roundToCents()` via `Number.EPSILON` to eliminate IEEE-754 drift.
- **State Persistence**:
  - Automatically loads and saves state in `localStorage` under `pft_transactions_v1`.
  - Full JSON export and JSON import for data backup and cross-device migration.
  - One-click sample demo dataset restoration.
- **Modern Dark Glassmorphism UI**:
  - Responsive two-column dashboard layout with CSS Grid & Flexbox.
  - Real-time search by keyword, transaction type (`income` / `expense`), category, and date range.
  - Interactive category spending and income progress bars.
  - Micro-animations, toast feedback, and accessible confirmation modals.

---

## 📁 Project Structure

```
personal-finance-tracker/
├── index.html                   # Semantic HTML5 dashboard layout & accessible controls
├── styles.css                   # Glassmorphic dark design system & tokens
├── server.js                    # Zero-dependency local dev server with traversal security
├── package.json                 # Project configuration & npm test/start scripts
├── .editorconfig                # Universal indentation and whitespace formatting rules
├── .gitattributes               # Line ending normalization & binary handling
├── .gitignore                   # Safe Git ignore pattern
├── README.md                    # Project documentation & reference
├── js/
│   ├── app.js                   # Application bootstrap, DOM listener dispatchers
│   ├── state.js                 # State manager, pub/sub dispatcher, localStorage sync
│   ├── calculations.js          # Pure calculation engine (strictly filter & reduce)
│   ├── categories.js            # Standard category definitions, colors, and icons
│   └── ui.js                    # View rendering, XSS sanitization, formatters & toasts
└── tests/
    ├── calculations.test.js     # Calculations engine unit tests (filter & reduce)
    ├── state.test.js            # StateManager CRUD, pub/sub & import/export tests
    ├── categories.test.js       # Category metadata resolution & fallback tests
    └── ui.test.js               # UI formatting and HTML sanitization unit tests
```

---

## 🧮 Pure Calculation Logic Reference

Every aggregate calculation adheres strictly to pure array functions:

```javascript
// Total Income
export const calculateTotalIncome = (transactions) =>
  roundToCents(
    transactions
      .filter((tx) => tx && tx.type === 'income')
      .reduce((acc, tx) => acc + Number(tx.amount || 0), 0)
  );

// Total Expenses
export const calculateTotalExpenses = (transactions) =>
  roundToCents(
    transactions
      .filter((tx) => tx && tx.type === 'expense')
      .reduce((acc, tx) => acc + Number(tx.amount || 0), 0)
  );

// Net Balance
export const calculateNetBalance = (transactions) =>
  roundToCents(
    transactions.reduce((balance, tx) => {
      const amount = Number(tx.amount || 0);
      return tx.type === 'income' ? balance + amount : balance - amount;
    }, 0)
  );

// Running Ledger Balances
export const calculateRunningBalances = (chronologicalTransactions) =>
  chronologicalTransactions.reduce((acc, tx) => {
    const prev = acc.length > 0 ? acc[acc.length - 1].runningBalance : 0;
    const delta = tx.type === 'income' ? Number(tx.amount || 0) : -Number(tx.amount || 0);
    acc.push({ ...tx, runningBalance: roundToCents(prev + delta) });
    return acc;
  }, []);
```

---

## 🧪 Running Automated Unit Tests

Execute the full unit test suite using Node's native test runner:

```bash
npm test
```

---

## 🚀 Running the Web Application Locally

Launch the zero-dependency local server using npm:

```bash
npm start
```
Then visit `http://localhost:8080` in your web browser.

Alternatively, you can launch using Python or npx:

```bash
# Using Python
python -m http.server 3000

# Or using npx
npx serve .
```
