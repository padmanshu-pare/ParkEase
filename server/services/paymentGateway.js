// Payment gateway. DEMO MODE: nothing is charged and no bank is contacted.
// Before go-live, add a "razorpay" object with the same three functions (createOrder,
// verifyPayment, refund) that calls the Razorpay SDK, and return it from getGateway().
// Callers in reservations.js do not change.
const crypto = require('crypto');

const demo = {
  name: 'demo',
  isDemo: true,
  async createOrder({ amount, receipt }) {
    return { orderId: `demo_order_${crypto.randomBytes(6).toString('hex')}`, amount, currency: 'INR', receipt };
  },
  async verifyPayment({ orderId }) {
    return { verified: Boolean(orderId), transactionId: `DEMO-${crypto.randomBytes(5).toString('hex').toUpperCase()}` };
  },
  async refund({ transactionId, amount }) {
    return { refundId: `DEMO-REF-${crypto.randomBytes(4).toString('hex').toUpperCase()}`, transactionId, amount, status: 'processed' };
  },
};

function getGateway() {
  return demo;
}

module.exports = { getGateway, demo };
