import { Router, type IRouter } from "express";
import healthRouter from "./health";
import playersRouter from "./players";
import matchesRouter from "./matches";
import rankingRouter from "./ranking";
import parejasRouter from "./parejas";

const router: IRouter = Router();

router.use(healthRouter);
router.use(playersRouter);
router.use(matchesRouter);
router.use(rankingRouter);
router.use(parejasRouter);

export default router;
