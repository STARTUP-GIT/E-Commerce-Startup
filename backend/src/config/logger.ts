import { requestStore } from "../middleware/requestStore.js";

export const logger = {
  info: (message: string, meta: Record<string, any> = {}) => {
    const store = requestStore.getStore();
    const output = { timestamp: new Date().toISOString(), level: "info", message, requestId: store?.requestId, ...meta };
    console.log(JSON.stringify(output));
  },
  warn: (message: string, meta: Record<string, any> = {}) => {
    const store = requestStore.getStore();
    const output = { timestamp: new Date().toISOString(), level: "warn", message, requestId: store?.requestId, ...meta };
    console.warn(JSON.stringify(output));
  },
  error: (message: string, meta: Record<string, any> = {}) => {
    const store = requestStore.getStore();
    const output = { timestamp: new Date().toISOString(), level: "error", message, requestId: store?.requestId, ...meta };
    console.error(JSON.stringify(output));
  },
  debug: (message: string, meta: Record<string, any> = {}) => {
    if (process.env.NODE_ENV?.toLowerCase() !== "production") {
      const store = requestStore.getStore();
      const output = { timestamp: new Date().toISOString(), level: "debug", message, requestId: store?.requestId, ...meta };
      console.debug(JSON.stringify(output));
    }
  }
};
