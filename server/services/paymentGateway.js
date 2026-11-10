// Payment gateway abstraction. Phase 1 uses a mock gateway so the whole flow can be tested.
// When you move to Razorpay, implement the same two functions with the Razorpay SDK
// (orders.create + signature/webhook verification) and switch GATEWAY=razorpay in .env.
const crypto = require('crypto');

const mock = {
  name: 'mock',
  async createOrder({ amount, receipt }) {
    return { orderId: `mock_order_${crypto.randomBytes(5).toString('hex')}`, amount, currency: 'INR', receipt };
  },
  async verifyPayment({ orderId }) {
    return { verified: Boolean(orderId), transactionId: `mock_txn_${crypto.randomBytes(5).toString('hex')}` };
  },
};

module.exports = mock;
