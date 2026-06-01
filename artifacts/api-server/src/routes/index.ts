import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import playersRouter from "./players";
import matchesRouter from "./matches";
import rankingRouter from "./ranking";
import parejasRouter from "./parejas";
import encuentrosRouter from "./encuentros";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(playersRouter);
router.use(matchesRouter);
router.use(rankingRouter);
router.use(parejasRouter);
router.use(encuentrosRouter);

export default router;
