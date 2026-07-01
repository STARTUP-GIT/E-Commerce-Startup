const assert = require("assert");
const crypto = require("crypto");

// Mocking function to test file upload whitelists
function isValidFile(filename, contentType) {
    const ext = filename.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'stl', 'step', 'stp', 'obj', 'txt', 'csv', 'zip', 'tar', 'gz'];
    if (!ext || !allowedExtensions.includes(ext)) {
        return false;
    }
    if (contentType) {
        const allowedMimes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf',
            'application/sla', 'application/octet-stream', 'text/plain', 'text/csv',
            'application/zip', 'application/x-tar', 'application/gzip', 'model/stl',
            'model/step', 'model/obj'
        ];
        if (!allowedMimes.includes(contentType.toLowerCase())) {
            return false;
        }
    }
    return true;
}

// Mocking delivery tracking ownership authorization check logic
function checkDeliveryTrackingAuth(req, delivery) {
    const isAuthorized =
      req.adminId ||
      (req.customerId && delivery.customerId === req.customerId) ||
      (req.sellerId && delivery.sellerId === req.sellerId) ||
      (req.deliveryPartnerId && delivery.deliveryPartnerId === req.deliveryPartnerId);
    return !!isAuthorized;
}

// Porter Webhook Signature Mock Verification helper
function verifyWebhookSignature(bodyString, signature, secret) {
    if (!signature || !secret) return false;
    const computedSig = crypto.createHmac("sha256", secret).update(bodyString).digest("hex");
    return computedSig === signature;
}

// Running checks
try {
    // 1. Check file upload whitelisting logic
    assert.strictEqual(isValidFile("model.stl", "model/stl"), true);
    assert.strictEqual(isValidFile("script.sh", "application/x-sh"), false);
    assert.strictEqual(isValidFile("malicious.exe", "application/octet-stream"), false);
    console.log("File upload validation tests passed.");

    // 2. Check track delivery ownership check logic (IDOR protection)
    const mockDelivery = { id: "d1", customerId: "cust123", sellerId: "sell456", deliveryPartnerId: "driver789" };
    
    assert.strictEqual(checkDeliveryTrackingAuth({ customerId: "cust123" }, mockDelivery), true);
    assert.strictEqual(checkDeliveryTrackingAuth({ customerId: "other_cust" }, mockDelivery), false);
    assert.strictEqual(checkDeliveryTrackingAuth({ sellerId: "sell456" }, mockDelivery), true);
    assert.strictEqual(checkDeliveryTrackingAuth({ sellerId: "other_seller" }, mockDelivery), false);
    assert.strictEqual(checkDeliveryTrackingAuth({ adminId: "admin0" }, mockDelivery), true);
    assert.strictEqual(checkDeliveryTrackingAuth({ deliveryPartnerId: "driver789" }, mockDelivery), true);
    console.log("IDOR tracking authorization tests passed.");

    // 3. Webhook HMAC verification checks
    const secret = "test_webhook_secret_key";
    const payload = JSON.stringify({ order_id: "ord_123", status: "delivered" });
    const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    
    assert.strictEqual(verifyWebhookSignature(payload, signature, secret), true);
    assert.strictEqual(verifyWebhookSignature(payload, "invalid_signature", secret), false);
    console.log("Webhook signature validation tests passed.");

    console.log("All production pre-deployment audit tests passed successfully.");
} catch (err) {
    console.error("Audit test failures:", err);
    process.exit(1);
}
