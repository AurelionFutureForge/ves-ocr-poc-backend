import express, { Router } from "express";
import TemplateRouter from "./template.router";

const ApiRouter: Router = express.Router();

ApiRouter.use("/templates", TemplateRouter);

export default ApiRouter;