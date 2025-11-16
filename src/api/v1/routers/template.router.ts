import { TemplateController } from "@/v1/controllers";
import express from "express";
import multer from "multer";

const templateRouter = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and PDFs are allowed.'));
    }
  },
});

templateRouter.get("/", TemplateController.getAllTemplatesController);
templateRouter.get("/:template_id", TemplateController.getTemplateByIdController);
templateRouter.put("/:template_id", TemplateController.updateTemplateController);

// Template field routes
templateRouter.post("/:template_id/fields", TemplateController.addTemplateFieldController);
templateRouter.put("/:template_id/fields/:field_id", TemplateController.updateTemplateFieldController);
templateRouter.delete("/:template_id/fields/:field_id", TemplateController.deleteTemplateFieldController);
templateRouter.post("/:template_id/extract-ocr", upload.single('document'), TemplateController.extractOcrFromTemplateController);

export default templateRouter;

