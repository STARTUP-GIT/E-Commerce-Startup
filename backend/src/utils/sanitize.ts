/**
 * Strip sensitive fields (password hashes) before serializing user records.
 * Never rely on this alone for authorization — it only removes data from API
 * responses.
 */
export const sanitizeCustomer = <T extends Record<string, any>>(obj: T): T => {
  if (!obj) return obj;
  const { passwordHash, ...rest } = obj;
  return rest as T;
};

export const sanitizeSeller = <T extends Record<string, any>>(obj: T): T => {
  if (!obj) return obj;
  const { passwordHash, ...rest } = obj;
  return rest as T;
};
