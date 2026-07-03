import multer from "multer";
import path from "path";
import fs from "fs";

// Temporary upload directory
const uploadDir = path.join(process.cwd(), "uploads", "temp");

// Create folder if it doesn't exist
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Multer Storage
 * Files are stored temporarily.
 * After upload they will be sent to Cloudinary
 * and then deleted from the server.
 */
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadDir);
    },

    filename: (_req, file, cb) => {
        const uniqueSuffix =
            Date.now() + "-" + Math.round(Math.random() * 1e9);

        const extension = path.extname(file.originalname);

        cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`);
    },
});

/**
 * Allowed Image Types
 */
const imageMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "image/webp",
    "image/avif",
];

/**
 * Allowed Document Types
 */
const documentMimeTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
    "image/jpg",
];

/**
 * Image Upload Middleware
 */
export const uploadImage = multer({
    storage,

    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB
    },

    fileFilter: (_req, file, cb) => {
        if (!imageMimeTypes.includes(file.mimetype)) {
            return cb(
                new Error(
                    "Only JPG, JPEG, PNG, WEBP and AVIF images are allowed."
                )
            );
        }

        cb(null, true);
    },
});

/**
 * Document Upload Middleware
 */
export const uploadDocument = multer({
    storage,

    limits: {
        fileSize: 20 * 1024 * 1024, // 20 MB
    },

    fileFilter: (_req, file, cb) => {
        if (!documentMimeTypes.includes(file.mimetype)) {
            return cb(
                new Error(
                    "Only PDF, DOC, DOCX, JPG, JPEG and PNG files are allowed."
                )
            );
        }

        cb(null, true);
    },
});

/**
 * Upload Single Image
 */
export const uploadSingleImage =
    uploadImage.single("image");

/**
 * Upload Multiple Images
 */
export const uploadMultipleImages =
    uploadImage.array("images", 10);

/**
 * Upload Shop Logo
 */
export const uploadShopLogo =
    uploadImage.single("shopLogo");

/**
 * Upload Shop Banner
 */
export const uploadShopBanner =
    uploadImage.single("shopBanner");

/**
 * Upload Profile Image
 */
export const uploadProfileImage =
    uploadImage.single("profileImage");

/**
 * Upload Product Images
 */
export const uploadProductImages =
    uploadImage.array("productImages", 10);

/**
 * Upload GST Document
 */
export const uploadGSTDocument =
    uploadDocument.single("gstDocument");

/**
 * Upload Identity Proof
 */
export const uploadIdentityProof =
    uploadDocument.single("identityProof");

/**
 * Upload Delivery Proof
 */
export const uploadDeliveryProof =
    uploadImage.single("deliveryProof");

/**
 * Upload Packing Proof
 */
export const uploadPackingProof =
    uploadImage.single("packingProof");

export default multer;