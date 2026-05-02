import { Router, type IRouter } from "express";
import healthRouter from "./health";
import servicesRouter from "./services";
import officesRouter from "./offices";
import contactsRouter from "./contacts";
import otcRouter from "./otc";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/services", servicesRouter);
router.use("/offices", officesRouter);
router.use("/contact", contactsRouter);
router.use("/otc", otcRouter);

export default router;
