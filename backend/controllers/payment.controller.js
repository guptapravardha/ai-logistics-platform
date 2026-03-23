const Invoice      = require('../models/Invoice');
const Payment      = require('../models/Payment');
const Notification = require('../models/Notification');

// ── Invoices ────────────────────────────────────────────

// GET /api/payments/invoices
exports.getAllInvoices = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status)  filter.status = status;
    if (search)  filter.$or = [
      { invoiceNumber: { $regex: search, $options: 'i' } },
      { client:        { $regex: search, $options: 'i' } },
      { shipmentRef:   { $regex: search, $options: 'i' } },
    ];

    const invoices = await Invoice.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Invoice.countDocuments(filter);

    res.json({ success: true, data: invoices, total, page: Number(page) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/payments/invoices/:id
exports.getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('shipmentId');
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, data: invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/payments/invoices
exports.createInvoice = async (req, res) => {
  try {
    const invoiceNumber = await Invoice.generateInvoiceNumber();
    const invoice = await Invoice.create({ ...req.body, invoiceNumber, createdBy: req.user._id });
    res.status(201).json({ success: true, data: invoice });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PUT /api/payments/invoices/:id
exports.updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, data: invoice });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE /api/payments/invoices/:id
exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    if (invoice.status === 'paid') return res.status(400).json({ success: false, message: 'Cannot delete a paid invoice' });
    await invoice.deleteOne();
    res.json({ success: true, message: 'Invoice deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/payments/invoices/:id/send
exports.sendInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    invoice.status = 'pending';
    await invoice.save();

    // Create notification
    await Notification.create({
      title:          `Invoice sent — ${invoice.client}`,
      message:        `${invoice.invoiceNumber} for ₹${invoice.totalAmount.toLocaleString('en-IN')} has been sent.`,
      type:           'invoice',
      channels:       ['email', 'push'],
      recipient:      req.user._id,
      relatedInvoice: invoice._id,
    });

    // TODO: trigger email via config/email.js
    // await sendInvoiceEmail(invoice);

    res.json({ success: true, message: 'Invoice sent successfully', data: invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/payments/invoices/:id/mark-paid
exports.markInvoicePaid = async (req, res) => {
  try {
    const { amountPaid, paymentMode, utrNumber } = req.body;
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    invoice.amountPaid = amountPaid || invoice.totalAmount;
    invoice.status     = 'paid';
    invoice.paidAt     = new Date();
    await invoice.save();

    // Record payment
    await Payment.create({
      invoiceId:     invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      client:        invoice.client,
      shipmentId:    invoice.shipmentRef,
      amount:        invoice.totalAmount,
      amountPaid:    invoice.amountPaid,
      paymentMode:   paymentMode || 'manual',
      utrNumber,
      status:        'completed',
      paidAt:        new Date(),
      createdBy:     req.user._id,
    });

    // Notification
    await Notification.create({
      title:          `₹${invoice.amountPaid.toLocaleString('en-IN')} received — ${invoice.client}`,
      message:        `${invoice.invoiceNumber} marked as paid. Ledger updated.`,
      type:           'payment',
      channels:       ['push'],
      recipient:      req.user._id,
      relatedInvoice: invoice._id,
    });

    res.json({ success: true, message: 'Invoice marked as paid', data: invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/payments/invoices/:id/reminder
exports.sendReminder = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    invoice.remindersSent  += 1;
    invoice.lastReminderAt  = new Date();
    await invoice.save();

    await Notification.create({
      title:          'Overdue reminder sent',
      message:        `${invoice.invoiceNumber} — reminder sent via email, push and WhatsApp.`,
      type:           'reminder',
      channels:       ['email', 'push', 'whatsapp'],
      recipient:      req.user._id,
      relatedInvoice: invoice._id,
    });

    // TODO: trigger WhatsApp/email via gateway

    res.json({ success: true, message: 'Reminder sent', data: invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Payments ────────────────────────────────────────────

// GET /api/payments
exports.getAllPayments = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const payments = await Payment.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('invoiceId', 'invoiceNumber client');

    res.json({ success: true, data: payments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/payments/:id
exports.getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).populate('invoiceId');
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    res.json({ success: true, data: payment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/payments
exports.createPayment = async (req, res) => {
  try {
    const payment = await Payment.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: payment });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// GET /api/payments/stats
exports.getPaymentStats = async (req, res) => {
  try {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [totalInvoiced, collected, invoiceCount] = await Promise.all([
      Invoice.aggregate([{ $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
      Invoice.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
      Invoice.countDocuments(),
    ]);

    const outstanding = await Invoice.aggregate([
      { $match: { status: { $in: ['pending', 'overdue', 'processing'] } } },
      { $group: { _id: null, total: { $sum: '$balanceDue' } } },
    ]);

    res.json({
      success: true,
      data: {
        totalInvoiced:  totalInvoiced[0]?.total  || 0,
        collected:      collected[0]?.total      || 0,
        outstanding:    outstanding[0]?.total    || 0,
        invoiceCount,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
