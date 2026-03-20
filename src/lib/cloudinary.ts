import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  secure: true,
  // Reads CLOUDINARY_URL env var automatically (cloudinary://API_KEY:API_SECRET@CLOUD_NAME)
});

export const CLOUDINARY_FOLDER = "p2p";

export default cloudinary;
