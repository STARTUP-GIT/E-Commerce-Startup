import { Router } from "express";
import { createUploadKey, getPresignedPutUrl } from "../../../config/storage.js";
import { prisma } from "../../../config/prisma.js";
import jwt from "jsonwebtoken";
import { z } from "zod";
const router = Router();

const authToken = (req: any) => {
  const cookieToken = req.cookies?.customer_session || req.cookies?.seller_session || req.cookies?.admin_session;
  if (cookieToken) return { token: cookieToken, type: req.cookies?.admin_session ? 'admin' : req.cookies?.seller_session ? 'seller' : 'customer' };
  if (req.headers.authorization?.startsWith('Bearer ')) return { token: req.headers.authorization.split(' ')[1], type: 'admin' };
  return null;
};

const authGuard = async (req: any, res: any, next: any) => {
  const auth = authToken(req);
  if (!auth) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const payload = jwt.verify(auth.token, process.env.JWT_SECRET_KEY!) as { id?: string };
    if (!payload?.id) return res.status(401).json({ message: 'Unauthorized' });
    if (auth.type === 'admin') {
      const admin = await prisma.admin.findUnique({ where: { id: payload.id } });
      if (!admin || !admin.isActive) return res.status(401).json({ message: 'Unauthorized or deactivated admin account' });
      req.adminId = payload.id;
    } else if (auth.type === 'seller') {
      req.sellerId = payload.id;
    } else {
      req.customerId = payload.id;
    }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

const PresignSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1).optional(),
  expiresIn: z.number().int().positive().optional()
});

router.post("/upload-url", authGuard, async (req, res) => {
  try {
    const parsed = PresignSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.issues.map((e: any) => e.message).join(', ') });
    const { filename, contentType, expiresIn } = parsed.data;

    // Validate file type, extension, and MIME type to prevent executable uploads
    const ext = filename.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'stl', 'step', 'stp', 'obj', 'txt', 'csv', 'zip', 'tar', 'gz'];
    if (!ext || !allowedExtensions.includes(ext)) {
      return res.status(400).json({ message: "Invalid or unauthorized file extension" });
    }

    if (contentType) {
      const allowedMimes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf',
        'application/sla', 'application/octet-stream', 'text/plain', 'text/csv',
        'application/zip', 'application/x-tar', 'application/gzip', 'model/stl',
        'model/step', 'model/obj'
      ];
      if (!allowedMimes.includes(contentType.toLowerCase())) {
        return res.status(400).json({ message: "Invalid or unauthorized MIME type" });
      }
    }

    const key = createUploadKey(filename);
    const url = await getPresignedPutUrl(key, contentType || "application/octet-stream", expiresIn || 900);
    return res.status(200).json({ url, key });
  } catch (err: any) {
    console.error("UPLOAD URL ERROR:", err);
    return res.status(500).json({ message: err.message || "Internal Server Error" });
  }
});

export default router;
