import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

const s3 = new S3Client({ region: process.env.AWS_REGION, credentials: process.env.AWS_ACCESS_KEY_ID ? {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
} : undefined });

export const createUploadKey = (filename: string) => {
  const uid = crypto.randomBytes(6).toString("hex");
  const ts = Date.now();
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return `uploads/${new Date().toISOString().slice(0,10)}/${ts}_${uid}_${safe}`;
};

export const getPresignedPutUrl = async (key: string, contentType = "application/octet-stream", expiresIn = 900) => {
  if (!process.env.S3_BUCKET) throw new Error("S3_BUCKET not configured");
  const cmd = new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, ContentType: contentType });
  const url = await getSignedUrl(s3, cmd, { expiresIn });
  return url;
};

export const getObjectUrl = (key: string) => {
  if (!process.env.S3_BUCKET || !process.env.AWS_REGION) throw new Error("S3_BUCKET or AWS_REGION not configured");
  const bucket = process.env.S3_BUCKET;
  const region = process.env.AWS_REGION;
  return `https://${bucket}.s3.${region}.amazonaws.com/${encodeURIComponent(key)}`;
};

export const isValidS3Key = (value: string) => {
  if (!value) return false;
  if (value.startsWith("uploads/")) return true;
  // allow full S3 URLs
  if (process.env.S3_BUCKET && value.includes(`${process.env.S3_BUCKET}.s3.`)) return true;
  return false;
};

const extractKeyFromUrl = (url: string) => {
  if (!process.env.S3_BUCKET || !process.env.AWS_REGION) return null;
  const bucket = process.env.S3_BUCKET;
  const region = process.env.AWS_REGION;
  const marker = `${bucket}.s3.${region}.amazonaws.com/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length));
};

export const headObjectExists = async (keyOrUrl: string) => {
  if (!keyOrUrl) return false;
  let key = keyOrUrl;
  if (keyOrUrl.startsWith('http')) {
    const extracted = extractKeyFromUrl(keyOrUrl);
    if (!extracted) return false;
    key = extracted;
  }
  if (!key.startsWith('uploads/')) return false;
  try {
    const cmd = new HeadObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key });
    await s3.send(cmd);
    return true;
  } catch (err: any) {
    if (err?.$metadata && err.$metadata.httpStatusCode === 404) return false;
    return false;
  }
};

export default { createUploadKey, getPresignedPutUrl };
