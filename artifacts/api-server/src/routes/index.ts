import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import playersRouter from "./players";
import matchesRouter from "./matches";
import rankingRouter from "./ranking";
import parejasRouter from "./parejas";
import encuentrosRouter from "./encuentros";
import clubRouter from "./club";
import publicClubRouter from "./publicClub";
import adminRouter from "./admin";
import cobrosRouter from "./cobros";
import sportsRouter from "./sports";
import categoriesRouter from "./categories";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(playersRouter);
router.use(matchesRouter);
router.use(rankingRouter);
router.use(parejasRouter);
router.use("/encuentros", encuentrosRouter);
router.use(clubRouter);
router.use(publicClubRouter);
router.use(adminRouter);
router.use("/cobros", cobrosRouter);
router.use(sportsRouter);
router.use(categoriesRouter);

export default router;
