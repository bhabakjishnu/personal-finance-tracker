/**
 * @fileoverview Unit test suite for UI formatting utilities and HTML sanitization.
 * Tests currency localization, date formatting, and XSS string escaping.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatCurrency, formatDate, escapeHtml } from '../js/ui.js';

describe('UI Utilities: formatCurrency', () => {
  it('should format positive dollar amounts into standard USD currency', () => {
    assert.equal(formatCurrency(1234.56), '$1,234.56');
    assert.equal(formatCurrency(500), '$500.00');
    assert.equal(formatCurrency(0), '$0.00');
  });

  it('should format negative dollar amounts cleanly', () => {
    const formatted = formatCurrency(-45.99);
    // Currency formatters can output -$45.99
    assert.ok(formatted.includes('45.99'));
    assert.ok(formatted.includes('$'));
  });

  it('should handle non-numeric or falsy inputs gracefully', () => {
    assert.equal(formatCurrency(null), '$0.00');
    assert.equal(formatCurrency(undefined), '$0.00');
    assert.equal(formatCurrency('invalid'), '$0.00');
  });
});

describe('UI Utilities: formatDate', () => {
  it('should format valid YYYY-MM-DD date strings into human-readable strings', () => {
    const formatted = formatDate('2026-03-15');
    assert.ok(formatted.includes('Mar'));
    assert.ok(formatted.includes('15'));
    assert.ok(formatted.includes('2026'));
  });

  it('should handle falsy or invalid date strings safely', () => {
    assert.equal(formatDate(''), '—');
    assert.equal(formatDate(null), '—');
    assert.equal(formatDate(undefined), '—');
  });
});

describe('UI Utilities: escapeHtml (XSS defense)', () => {
  it('should escape dangerous HTML characters to prevent XSS attacks', () => {
    const malicious = '<script>alert("xss")</script>&<b>bold</b>';
    const escaped = escapeHtml(malicious);

    assert.ok(!escaped.includes('<script>'));
    assert.ok(!escaped.includes('</script>'));
    assert.ok(escaped.includes('&lt;script&gt;'));
    assert.ok(escaped.includes('&quot;xss&quot;'));
    assert.ok(escaped.includes('&amp;&lt;b&gt;bold&lt;/b&gt;'));
  });

  it('should escape single and double quotes', () => {
    assert.equal(escapeHtml(`'hello' and "world"`), '&#039;hello&#039; and &quot;world&quot;');
  });

  it('should handle null, undefined, and non-string inputs safely', () => {
    assert.equal(escapeHtml(null), '');
    assert.equal(escapeHtml(undefined), '');
    assert.equal(escapeHtml(12345), '12345');
    assert.equal(escapeHtml('Regular text'), 'Regular text');
  });
});
