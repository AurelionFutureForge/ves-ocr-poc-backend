import express, { Router } from "express";
import TemplateRouter from "./template.router";
import OcrRouter from "./ocr.router";

const ApiRouter: Router = express.Router();

ApiRouter.use("/templates", TemplateRouter);
ApiRouter.use("/ocr", OcrRouter);

export default ApiRouter;