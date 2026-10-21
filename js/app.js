/**
 * @fileoverview Application entry point and orchestrator for Personal Finance Tracker.
 * Binds UI interactions, form workflows, export/import mechanics, and state subscriptions.
 */

import { state } from './state.js';
import {
  renderSummaryCards,
  renderCategoryBreakdown,
  renderLedgerTable,
  updateCategoryDropdown,
  populateFilterCategoryDropdown,
  showToast
} from './ui.js';

let activeBreakdownType = 'expense';

/**
 * Initializes the application lifecycle, wires DOM listeners, and triggers initial render.
 */
document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Default Form Date to Today (YYYY-MM-DD)
  const dateInput = document.getElementById('transactionDate');
  if (dateInput) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }

  // 2. Initialize Category Selects
  updateCategoryDropdown('expense');
  populateFilterCategoryDropdown();

  // 3. Subscribe to Reactive State Updates
  state.subscribe((currentState) => {
    renderSummaryCards(currentState.transactions);
    renderCategoryBreakdown(currentState.transactions, activeBreakdownType);
    renderLedgerTable(currentState.transactions, currentState.filters, (txId) => {
      handleDeleteTransaction(txId);
    });
  });

  // 4. Initial Render Trigger
  const initialState = state.getState();
  renderSummaryCards(initialState.transactions);
  renderCategoryBreakdown(initialState.transactions, activeBreakdownType);
  renderLedgerTable(initialState.transactions, initialState.filters, (txId) => {
    handleDeleteTransaction(txId);
  });

  // 5. Wire Form Type Radio Changes (Income vs Expense)
  const typeRadios = document.querySelectorAll('input[name="transactionType"]');
  typeRadios.forEach((radio) => {
    radio.addEventListener('change', (e) => {
      const selectedType = e.target.value;
      updateCategoryDropdown(selectedType);
    });
  });

  // 6. Wire New Transaction Submission
  const txForm = document.getElementById('transactionForm');
  if (txForm) {
    txForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleCreateTransaction();
    });
  }

  // 7. Wire Filter Controls
  setupFilterListeners();

  // 8. Wire Category Breakdown Type Switcher Tabs
  setupBreakdownTabListeners();

  // 9. Wire Header Actions (Demo Data, Clear, Export, Import)
  setupHeaderActionListeners();
});

/**
 * Handles creation of a new transaction from form values.
 */
function handleCreateTransaction() {
  const descEl = document.getElementById('transactionDescription');
  const amountEl = document.getElementById('transactionAmount');
  const typeEl = document.querySelector('input[name="transactionType"]:checked');
  const categoryEl = document.getElementById('transactionCategory');
  const dateEl = document.getElementById('transactionDate');

  const description = descEl ? descEl.value.trim() : '';
  const amount = amountEl ? parseFloat(amountEl.value) : NaN;
  const type = typeEl ? typeEl.value : 'expense';
  const category = categoryEl ? categoryEl.value : 'Other';
  const date = dateEl ? dateEl.value : '';

  if (!description) {
    showToast('Please provide a transaction description.', 'error');
    if (descEl) descEl.focus();
    return;
  }

  if (isNaN(amount) || amount <= 0) {
    showToast('Please enter a valid amount greater than $0.', 'error');
    if (amountEl) amountEl.focus();
    return;
  }

  try {
    state.addTransaction({
      description,
      amount,
      type,
      category,
      date: date || new Date().toISOString().split('T')[0]
    });

    // Reset description & amount inputs
    if (descEl) descEl.value = '';
    if (amountEl) amountEl.value = '';

    showToast(`Added ${type}: "${description}"`, 'success');
  } catch (err) {
    showToast(err.message || 'Failed to record transaction', 'error');
  }
}

/**
 * Handles deletion of a single transaction.
 *
 * @param {string} id - Transaction ID.
 */
function handleDeleteTransaction(id) {
  const deleted = state.deleteTransaction(id);
  if (deleted) {
    showToast('Transaction removed successfully.', 'info');
  }
}

/**
 * Sets up event listeners for search bar, type filter, category filter, and date inputs.
 */
function setupFilterListeners() {
  const searchInput = document.getElementById('filterSearch');
  const typeSelect = document.getElementById('filterType');
  const categorySelect = document.getElementById('filterCategory');
  const fromDateInput = document.getElementById('filterFromDate');
  const toDateInput = document.getElementById('filterToDate');
  const resetBtn = document.getElementById('btnResetFilters');

  let debounceTimer = null;

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        state.setFilters({ searchQuery: e.target.value });
      }, 180);
    });
  }

  if (typeSelect) {
    typeSelect.addEventListener('change', (e) => {
      state.setFilters({ type: e.target.value });
    });
  }

  if (categorySelect) {
    categorySelect.addEventListener('change', (e) => {
      state.setFilters({ category: e.target.value });
    });
  }

  if (fromDateInput) {
    fromDateInput.addEventListener('change', (e) => {
      state.setFilters({ fromDate: e.target.value || null });
    });
  }

  if (toDateInput) {
    toDateInput.addEventListener('change', (e) => {
      state.setFilters({ toDate: e.target.value || null });
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (typeSelect) typeSelect.value = 'all';
      if (categorySelect) categorySelect.value = 'all';
      if (fromDateInput) fromDateInput.value = '';
      if (toDateInput) toDateInput.value = '';

      state.resetFilters();
      showToast('Filters cleared', 'info');
    });
  }
}

/**
 * Wires the tab buttons that switch category breakdown between Expense and Income.
 */
function setupBreakdownTabListeners() {
  const tabExpense = document.getElementById('tabBreakdownExpense');
  const tabIncome = document.getElementById('tabBreakdownIncome');

  if (tabExpense && tabIncome) {
    tabExpense.addEventListener('click', () => {
      activeBreakdownType = 'expense';
      tabExpense.classList.add('tab-active');
      tabIncome.classList.remove('tab-active');
      renderCategoryBreakdown(state.getState().transactions, activeBreakdownType);
    });

    tabIncome.addEventListener('click', () => {
      activeBreakdownType = 'income';
      tabIncome.classList.add('tab-active');
      tabExpense.classList.remove('tab-active');
      renderCategoryBreakdown(state.getState().transactions, activeBreakdownType);
    });
  }
}

/**
 * Configures top action buttons: export JSON, import JSON, restore demo, clear data.
 */
function setupHeaderActionListeners() {
  const btnExport = document.getElementById('btnExportData');
  const btnImportTrigger = document.getElementById('btnImportTrigger');
  const fileInput = document.getElementById('fileImportInput');
  const btnRestoreDemo = document.getElementById('btnRestoreDemo');
  const btnClearAll = document.getElementById('btnClearAll');
  const modal = document.getElementById('confirmModal');
  const modalConfirmBtn = document.getElementById('modalConfirmBtn');
  const modalCancelBtn = document.getElementById('modalCancelBtn');

  // Export JSON file
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      const dataStr = state.exportJSON();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `finance_tracker_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Exported backup successfully!', 'success');
    });
  }

  // Trigger file dialog
  if (btnImportTrigger && fileInput) {
    btnImportTrigger.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const count = state.importJSON(event.target.result);
          showToast(`Imported ${count} transactions successfully!`, 'success');
        } catch (err) {
          showToast(`Import failed: ${err.message}`, 'error');
        } finally {
          fileInput.value = '';
        }
      };
      reader.readAsText(file);
    });
  }

  // Restore seed demonstration data
  if (btnRestoreDemo) {
    btnRestoreDemo.addEventListener('click', () => {
      state.restoreDemoData();
      showToast('Demo dataset restored.', 'success');
    });
  }

  // Confirmation modal for Clear All
  if (btnClearAll && modal && modalConfirmBtn && modalCancelBtn) {
    btnClearAll.addEventListener('click', () => {
      modal.classList.add('modal-visible');
    });

    modalCancelBtn.addEventListener('click', () => {
      modal.classList.remove('modal-visible');
    });

    modalConfirmBtn.addEventListener('click', () => {
      state.clearAll();
      modal.classList.remove('modal-visible');
      showToast('All transaction records cleared.', 'info');
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('modal-visible');
      }
    });
  }
}
