import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import playerEditRouter from "./playerEdit";
import playersRouter from "./players";
import matchesRouter from "./matches";
import rankingRouter from "./ranking";
import parejasRouter from "./parejas";
import encuentrosRouter from "./encuentros";
import clubRouter from "./club";
import publicClubRouter from "./publicClub";
import adminRouter from "./admin";
import cobrosRouter from "./cobros";
import torneoRouter from "./torneo";
import sportsRouter from "./sports";
import categoriesRouter from "./categories";
import clubCategoriesP0Router from "./clubCategoriesP0";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);

// Las rutas públicas deben registrarse antes de cualquier router que aplique
// requireCommunityAccess a nivel de router, para que no queden bloqueadas
// por la autenticación/comunidad de rutas privadas.
router.use(publicClubRouter);

// Player edit is registered before the legacy PATCH in players.ts so the
// complete authorization/validation boundary handles every player update.
router.use(playerEditRouter);
router.use(playersRouter);
router.use(matchesRouter);
router.use(rankingRouter);
router.use(parejasRouter);
router.use("/encuentros", encuentrosRouter);

// P0: persisted community categories must win over the legacy mock/local handler.
router.use(clubCategoriesP0Router);
router.use(clubRouter);
router.use(adminRouter);
router.use("/cobros", cobrosRouter);
router.use("/torneo-calculos", torneoRouter);
router.use(sportsRouter);
router.use(categoriesRouter);

export default router;
