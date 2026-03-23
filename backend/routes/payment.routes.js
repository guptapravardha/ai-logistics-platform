const express  = require('express');
const router   = express.Router();
const auth     = require('../middleware/auth');
const {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  sendInvoice,
  markInvoicePaid,
  sendReminder,
  getAllPayments,
  getPaymentById,
  createPayment,
  getPaymentStats,
} = require('../controllers/payment.controller');

// ── Invoice Routes ──────────────────────────────────────

// GET  /api/payments/invoices          — list all invoices (with filters)
// POST /api/payments/invoices          — create new invoice
router.route('/invoices')
  .get(auth, getAllInvoices)
  .post(auth, createInvoice);

// GET  /api/payments/invoices/:id      — get single invoice
// PUT  /api/payments/invoices/:id      — update invoice
// DELETE /api/payments/invoices/:id   — delete invoice
router.route('/invoices/:id')
  .get(auth, getInvoiceById)
  .put(auth, updateInvoice)
  .delete(auth, deleteInvoice);

// POST /api/payments/invoices/:id/send         — send invoice to client (email + push)
router.post('/invoices/:id/send', auth, sendInvoice);

// POST /api/payments/invoices/:id/mark-paid    — manually mark invoice as paid
router.post('/invoices/:id/mark-paid', auth, markInvoicePaid);

// POST /api/payments/invoices/:id/reminder     — send overdue reminder
router.post('/invoices/:id/reminder', auth, sendReminder);

// ── Payment Routes ──────────────────────────────────────

// GET  /api/payments            — list all payment transactions
// POST /api/payments            — record a payment
router.route('/')
  .get(auth, getAllPayments)
  .post(auth, createPayment);

// GET  /api/payments/stats      — payment summary stats (total, collected, outstanding)
router.get('/stats', auth, getPaymentStats);

// GET  /api/payments/:id        — get single payment
router.get('/:id', auth, getPaymentById);

module.exports = router;
