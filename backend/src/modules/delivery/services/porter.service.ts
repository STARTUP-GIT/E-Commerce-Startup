import axios from "axios";
import type { AxiosRequestConfig } from "axios";
import crypto from "crypto";

const PORTER_API_URL = process.env.PORTER_API_URL;
const PORTER_API_KEY = process.env.PORTER_API_KEY;
const PORTER_WEBHOOK_SECRET = process.env.PORTER_WEBHOOK_SECRET;

const DEFAULT_RETRIES = 3;
const CIRCUIT_BREAKER_THRESHOLD = Number(process.env.PORTER_CIRCUIT_THRESHOLD || 5);
const CIRCUIT_BREAKER_TIMEOUT = Number(process.env.PORTER_CIRCUIT_TIMEOUT_MS || 30000);
const REQUEST_TIMEOUT_MS = Number(process.env.PORTER_REQUEST_TIMEOUT_MS || 10000);
let failureCount = 0;
let circuitOpenUntil = 0;
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function requestWithRetry<T>(config: AxiosRequestConfig, retries = DEFAULT_RETRIES) {
  if (Date.now() < circuitOpenUntil) {
    throw new Error('Porter provider circuit is open');
  }

  let attempt = 0;
  let lastError: any;
  config.timeout = REQUEST_TIMEOUT_MS;

  while (attempt <= retries) {
    try {
      const resp = await axios(config);
      failureCount = 0;
      return resp.data as T;
    } catch (err: any) {
      lastError = err;
      attempt += 1;
      const status = err?.response?.status;
      const shouldRetry = !status || status >= 500;
      if (!shouldRetry || attempt > retries) break;
      const backoff = 200 * Math.pow(2, attempt);
      await delay(backoff);
    }
  }

  failureCount += 1;
  if (failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
    circuitOpenUntil = Date.now() + CIRCUIT_BREAKER_TIMEOUT;
  }
  throw lastError;
}

export class PorterService {
  static async estimatePrice(pickupAddress: string, deliveryAddress: string) {
    try {
      if (PORTER_API_URL && PORTER_API_KEY) {
        const cfg: AxiosRequestConfig = {
          method: "post",
          url: `${PORTER_API_URL}/v1/estimate`,
          data: { pickupAddress, deliveryAddress },
          headers: { Authorization: `Bearer ${PORTER_API_KEY}` }
        };
        return await requestWithRetry(cfg);
      }

      return { amount: 80, currency: "INR" };
    } catch (err) {
      console.error("Porter estimate error", err);
      throw err;
    }
  }

  static async createBooking(payload: any) {
    try {
      if (PORTER_API_URL && PORTER_API_KEY) {
        const cfg: AxiosRequestConfig = { method: "post", url: `${PORTER_API_URL}/v1/bookings`, data: payload, headers: { Authorization: `Bearer ${PORTER_API_KEY}` } };
        return await requestWithRetry(cfg);
      }

      return {
        providerOrderId: `porter_${Date.now()}`,
        trackingId: `trk_${Date.now()}`,
        estimatedPickupTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        estimatedDeliveryTime: new Date(Date.now() + 45 * 60 * 1000).toISOString()
      };
    } catch (err) {
      console.error("Porter booking error", err);
      throw err;
    }
  }

  static async cancelBooking(providerOrderId: string) {
    try {
      if (PORTER_API_URL && PORTER_API_KEY) {
        const cfg: AxiosRequestConfig = { method: "post", url: `${PORTER_API_URL}/v1/bookings/${providerOrderId}/cancel`, data: {}, headers: { Authorization: `Bearer ${PORTER_API_KEY}` } };
        return await requestWithRetry(cfg);
      }
      return { cancelled: true };
    } catch (err) {
      console.error("Porter cancel error", err);
      throw err;
    }
  }

  static async trackBooking(providerOrderId: string) {
    try {
      if (PORTER_API_URL && PORTER_API_KEY) {
        const cfg: AxiosRequestConfig = { method: "get", url: `${PORTER_API_URL}/v1/bookings/${providerOrderId}/track`, headers: { Authorization: `Bearer ${PORTER_API_KEY}` } };
        return await requestWithRetry(cfg);
      }
      return { status: "DRIVER_ASSIGNED", driver: null };
    } catch (err) {
      console.error("Porter track error", err);
      throw err;
    }
  }

  static async getDriver(providerOrderId: string) {
    try {
      if (PORTER_API_URL && PORTER_API_KEY) {
        const cfg: AxiosRequestConfig = { method: "get", url: `${PORTER_API_URL}/v1/bookings/${providerOrderId}/driver`, headers: { Authorization: `Bearer ${PORTER_API_KEY}` } };
        return await requestWithRetry(cfg);
      }
      return null;
    } catch (err) {
      console.error("Porter getDriver error", err);
      throw err;
    }
  }

  static async downloadLabel(providerOrderId: string) {
    try {
      if (PORTER_API_URL && PORTER_API_KEY) {
        const resp = await axios.get(`${PORTER_API_URL}/v1/bookings/${providerOrderId}/label`, {
          headers: { Authorization: `Bearer ${PORTER_API_KEY}` },
          responseType: "arraybuffer"
        });
        return resp.data;
      }
      return null;
    } catch (err) {
      console.error("Porter label error", err);
      throw err;
    }
  }

  static verifyWebhookSignature(payloadBody: any, signature?: string) {
    if (!PORTER_WEBHOOK_SECRET) return false;
    if (!signature) return false;
    const body = typeof payloadBody === "string" ? payloadBody : JSON.stringify(payloadBody);
    const hmac = crypto.createHmac("sha256", PORTER_WEBHOOK_SECRET).update(body).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
  }
}

export default PorterService;
