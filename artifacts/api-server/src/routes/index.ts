import { Router, type IRouter } from "express";
import healthRouter from "./health";
import servicesRouter from "./services";
import officesRouter from "./offices";
import contactsRouter from "./contacts";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/services", servicesRouter);
router.use("/offices", officesRouter);
router.use("/contact", contactsRouter);

export default router;
