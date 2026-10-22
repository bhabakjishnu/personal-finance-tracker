/**
 * @fileoverview UI rendering and DOM manipulation module for Personal Finance Tracker.
 * Handles reactive rendering of stat cards, running balance ledgers,
 * category progress bars, toast alerts, and dynamic category dropdowns.
 */

import {
  calculateTotalIncome,
  calculateTotalExpenses,
  calculateNetBalance,
  calculateRunningBalances,
  calculateCategoryTotals,
  calculateSavingsRate,
  filterTransactions
} from './calculations.js';
import { CATEGORIES, getCategoryMeta } from './categories.js';

/**
 * Formats a numerical amount as a standard USD currency string ($X,XXX.XX).
 *
 * @param {number} amount - The numeric dollar value.
 * @returns {string} Formatted localized currency string.
 */
export const formatCurrency = (amount) => {
  const numeric = Number(amount) || 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numeric);
};

/**
 * Formats an ISO date string (YYYY-MM-DD) into a clean, human-readable display string.
 *
 * @param {string} dateString - ISO date format.
 * @returns {string} Localized date string.
 */
export const formatDate = (dateString) => {
  if (!dateString) return '—';
  try {
    const [year, month, day] = dateString.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
};

/**
 * Sanitizes an untrusted string for secure insertion into HTML contexts,
 * escaping &, <, >, ", and ' characters to prevent Cross-Site Scripting (XSS).
 *
 * @param {string|number|null|undefined} str - The raw input to escape.
 * @returns {string} The HTML-escaped string.
 */
export const escapeHtml = (str) => {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Renders the top overview stat cards (Net Balance, Income, Expenses, Savings Rate).
 *
 * @param {Array<Object>} transactions - Unfiltered global transaction collection.
 */
export const renderSummaryCards = (transactions) => {
  const netBalance = calculateNetBalance(transactions);
  const totalIncome = calculateTotalIncome(transactions);
  const totalExpenses = calculateTotalExpenses(transactions);
  const savingsRate = calculateSavingsRate(transactions);

  const balanceEl = document.getElementById('statNetBalance');
  const incomeEl = document.getElementById('statTotalIncome');
  const expensesEl = document.getElementById('statTotalExpenses');
  const savingsEl = document.getElementById('statSavingsRate');
  const balanceCard = document.getElementById('cardNetBalance');

  if (balanceEl) {
    balanceEl.textContent = formatCurrency(netBalance);
    if (balanceCard) {
      balanceCard.classList.remove('status-positive', 'status-negative');
      balanceCard.classList.add(netBalance >= 0 ? 'status-positive' : 'status-negative');
    }
  }

  if (incomeEl) {
    incomeEl.textContent = formatCurrency(totalIncome);
  }

  if (expensesEl) {
    expensesEl.textContent = formatCurrency(totalExpenses);
  }

  if (savingsEl) {
    savingsEl.textContent = `${savingsRate}%`;
  }
};

/**
 * Renders category expenditure and income progress bars.
 *
 * @param {Array<Object>} transactions - Transactions collection.
 * @param {'expense' | 'income'} [type='expense'] - Grouping category type.
 */
export const renderCategoryBreakdown = (transactions, type = 'expense') => {
  const container = document.getElementById('categoryBreakdownContainer');
  if (!container) return;

  const categories = calculateCategoryTotals(transactions, type);

  if (categories.length === 0) {
    container.innerHTML = `
      <div class="empty-category-state">
        <p>No ${type} transactions recorded yet.</p>
      </div>
    `;
    return;
  }

  const html = categories
    .map((item) => {
      const meta = getCategoryMeta(item.category, type);
      const safeLabel = escapeHtml(meta.label);
      const safeIcon = escapeHtml(meta.icon);
      return `
        <div class="category-row">
          <div class="category-info">
            <div class="category-name-wrapper">
              <span class="category-icon" style="background-color: ${meta.color}20; color: ${meta.color}">${safeIcon}</span>
              <span class="category-label">${safeLabel}</span>
            </div>
            <div class="category-numbers">
              <span class="category-amount">${formatCurrency(item.amount)}</span>
              <span class="category-percent">${item.percentage}%</span>
            </div>
          </div>
          <div class="progress-bar-bg">
            <div 
              class="progress-bar-fill" 
              style="width: ${item.percentage}%; background-color: ${meta.color};"
            ></div>
          </div>
        </div>
      `;
    })
    .join('');

  container.innerHTML = html;
};

/**
 * Renders the ledger table with running balances computed step-by-step using reduce.
 *
 * @param {Array<Object>} allTransactions - Global transaction collection.
 * @param {Object} filters - Active filtering criteria.
 * @param {Function} onDeleteCallback - Callback triggered when clicking delete on a row.
 */
export const renderLedgerTable = (allTransactions, filters, onDeleteCallback) => {
  const tbody = document.getElementById('ledgerTableBody');
  const ledgerCountEl = document.getElementById('ledgerCount');
  if (!tbody) return;

  // 1. Sort all transactions chronologically (oldest to newest) to compute legitimate running balances
  const chronological = [...allTransactions].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.createdAt || 0) - (b.createdAt || 0);
  });

  // 2. Compute running balance for each transaction strictly via calculateRunningBalances (reduce pipeline)
  const withRunningBalances = calculateRunningBalances(chronological);

  // 3. Filter transactions based on active search, type, category, and date criteria
  const filtered = filterTransactions(withRunningBalances, filters);

  // 4. Reverse for ledger display so most recent transactions appear at top
  const displayItems = [...filtered].reverse();

  if (ledgerCountEl) {
    ledgerCountEl.textContent = `${displayItems.length} transaction${displayItems.length === 1 ? '' : 's'}`;
  }

  if (displayItems.length === 0) {
    tbody.innerHTML = `
      <tr class="empty-table-row">
        <td colspan="7">
          <div class="table-empty-state">
            <div class="empty-icon">📂</div>
            <h4>No transactions found</h4>
            <p>Try adjusting your search criteria or add a new transaction above.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = displayItems
    .map((tx) => {
      const meta = getCategoryMeta(tx.category, tx.type);
      const isIncome = tx.type === 'income';
      const amountPrefix = isIncome ? '+' : '-';
      const amountClass = isIncome ? 'tx-income' : 'tx-expense';
      const balanceClass = tx.runningBalance >= 0 ? 'balance-positive' : 'balance-negative';
      const safeDesc = escapeHtml(tx.description);
      const safeId = escapeHtml(tx.id);
      const safeLabel = escapeHtml(meta.label);
      const safeIcon = escapeHtml(meta.icon);

      return `
        <tr class="ledger-row" data-id="${safeId}">
          <td class="col-date">${formatDate(tx.date)}</td>
          <td class="col-desc">
            <div class="tx-description" title="${safeDesc}">${safeDesc}</div>
          </td>
          <td class="col-category">
            <span class="category-pill" style="border-color: ${meta.color}40; background-color: ${meta.color}15;">
              <span class="pill-icon">${safeIcon}</span>
              <span class="pill-label">${safeLabel}</span>
            </span>
          </td>
          <td class="col-type">
            <span class="type-badge ${isIncome ? 'badge-income' : 'badge-expense'}">
              ${isIncome ? 'Income' : 'Expense'}
            </span>
          </td>
          <td class="col-amount ${amountClass}">
            ${amountPrefix}${formatCurrency(tx.amount)}
          </td>
          <td class="col-running ${balanceClass}">
            ${formatCurrency(tx.runningBalance)}
          </td>
          <td class="col-actions">
            <button 
              type="button" 
              class="btn-delete-row" 
              data-id="${safeId}" 
              title="Delete transaction"
              aria-label="Delete transaction ${safeDesc}"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </td>
        </tr>
      `;
    })
    .join('');

  // Attach delete handlers to row buttons
  tbody.querySelectorAll('.btn-delete-row').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      if (id && typeof onDeleteCallback === 'function') {
        onDeleteCallback(id);
      }
    });
  });
};

/**
 * Populates category dropdown options in the transaction creation form.
 *
 * @param {'income' | 'expense'} selectedType - Active transaction type.
 */
export const updateCategoryDropdown = (selectedType = 'expense') => {
  const select = document.getElementById('transactionCategory');
  if (!select) return;

  const categories = CATEGORIES[selectedType] || [];
  select.innerHTML = categories
    .map((cat) => `<option value="${escapeHtml(cat.id)}">${escapeHtml(cat.icon)} ${escapeHtml(cat.label)}</option>`)
    .join('');
};

/**
 * Populates category options in the filter bar.
 */
export const populateFilterCategoryDropdown = () => {
  const filterSelect = document.getElementById('filterCategory');
  if (!filterSelect) return;

  const allCategories = [...CATEGORIES.income, ...CATEGORIES.expense];
  // Remove duplicates by ID
  const uniqueMap = new Map();
  allCategories.forEach((c) => uniqueMap.set(c.id, c));

  const options = Array.from(uniqueMap.values())
    .map((cat) => `<option value="${escapeHtml(cat.id)}">${escapeHtml(cat.icon)} ${escapeHtml(cat.label)}</option>`)
    .join('');

  filterSelect.innerHTML = `<option value="all">All Categories</option>${options}`;
};

/**
 * Displays a toast notification in the UI.
 *
 * @param {string} message - Notification text.
 * @param {'success' | 'error' | 'info'} [type='success'] - Toast flavor.
 */
export const showToast = (message, type = 'success') => {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ'
  };

  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ'}</span>
    <span class="toast-message">${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  // Trigger enter animation
  requestAnimationFrame(() => {
    toast.classList.add('toast-visible');
  });

  // Automatically dismiss after 3.2 seconds
  setTimeout(() => {
    toast.classList.remove('toast-visible');
    setTimeout(() => toast.remove(), 300);
  }, 3200);
};
