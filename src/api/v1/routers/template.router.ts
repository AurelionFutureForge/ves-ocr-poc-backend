import { TemplateController } from "@/v1/controllers";
import express from "express";

const templateRouter = express.Router();

templateRouter.get("/", TemplateController.getAllTemplatesController);
templateRouter.get("/:template_id", TemplateController.getTemplateByIdController);
templateRouter.put("/:template_id", TemplateController.updateTemplateController);

export default templateRouter;

