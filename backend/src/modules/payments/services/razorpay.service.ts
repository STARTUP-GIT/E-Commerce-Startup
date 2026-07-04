import Razorpay from "razorpay";
import crypto from "crypto";

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!
});

export const createPayment = async (paymentData: { amount: number; currency: string; receipt: string }) => {
    // Razorpay amount is in paise (1 INR = 100 paise)
    const options = {
        amount: Math.round(paymentData.amount * 100),
        currency: paymentData.currency || "INR",
        receipt: paymentData.receipt
    };
    const order = await razorpay.orders.create(options);
    return {
        id: order.id,
        entity: order.entity,
        amount: Number(order.amount) / 100,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status
    };
};

export const verifyPayment = async (paymentData: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
}) => {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = paymentData;
    const keySecret = process.env.RAZORPAY_KEY_SECRET!;

    const generatedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest("hex");

    return generatedSignature === razorpaySignature;
};

export const refundPayment = async (paymentData: { paymentId: string; amount?: number }) => {
    const options: any = {};
    if (paymentData.amount) {
        options.amount = Math.round(paymentData.amount * 100);
    }
    const refund = await razorpay.payments.refund(paymentData.paymentId, options);
    return {
        id: refund.id,
        paymentId: refund.payment_id,
        amount: Number(refund.amount) / 100,
        status: refund.status,
        createdAt: refund.created_at
    };
};

export const capturePayment = async (paymentId: string, amount: number) => {
    const paiseAmount = Math.round(amount * 100);
    const payment = await razorpay.payments.capture(paymentId, paiseAmount, "INR");
    return {
        id: payment.id,
        status: payment.status,
        amount: Number(payment.amount) / 100
    };
};

export const fetchPayment = async (paymentId: string) => {
    const payment = await razorpay.payments.fetch(paymentId);
    return {
        id: payment.id,
        amount: Number(payment.amount) / 100,
        status: payment.status,
        orderId: payment.order_id,
        method: payment.method
    };
};

export const createOrder = createPayment;
export const verifySignature = verifyPayment;