<<<<<<< HEAD
import { Router } from "express";
import * as ctrl from "../controllers/retencion.controllers.js";
import * as vali from "../middlewares/params.middleware.js";
import * as midd from "../middlewares/retencion.middleware.js";
import { verificaToken } from "../middlewares/token.middleware.js";

const router = Router();

router.get("/islr",verificaToken, ctrl.getRetencionesIslrController);
router.get("/iva",verificaToken, ctrl.getRetencionesIvaController);
router.post("/isrl/:numcom", verificaToken, vali.valPathParamNumCom, midd.valPostBodyRetencion, ctrl.postAgregarRetencionIsrlController);
router.post("/iva/:numcom", verificaToken, vali.valPathParamNumCom, midd.valPostBodyRetencion, ctrl.postAgregarRetencionIvaController);

// router.post("/agregar-isrl/:numcom", verificaToken, vali.valPathParamNumCom, midd.valPostBodyRetencion, ctrl.postAgregarRetencionIsrlController);
// router.post("/agregar-iva/:numcom", verificaToken, vali.valPathParamNumCom, midd.valPostBodyRetencion, ctrl.postAgregarRetencionIvaController);
=======
// import { Router } from "express";
// import * as ctrl from "../controllers/retencion.controllers.js";
// import * as valiParam from "../middlewares/params.middleware.js";
// import * as valiData from "../middlewares/factura.middleware.js";
// // import { verificaToken } from "../middlewares/token.middleware.js";
// // import { verificaAutorizacionAdmin } from "../middlewares/autorization.middleware.js";

// const router = Router();

// router.get(
//     "/retencionesIslr",
//     // verificaToken,
//     // valiParam.valPathParamId,
//     ctrl.getRetencionesIslrController,
// );

// router.get(
//     "/retencionesIva",
//     // verificaToken,
//     // valiParam.valPathParamId,
//     ctrl.getRetencionesIvaController,
// );

// router.post(
//     "/agregarRetencionIsrl",
//     // verificaToken,
//     // verificaAutorizacionAdmin,
//     ctrl.postAgregarRetencionIsrlController,
// );

// router.post(
//     "/agregarRetencionIva",
//     // verificaToken,
//     // verificaAutorizacionAdmin,
//     ctrl.postAgregarRetencionIvaController,
// );
>>>>>>> 933874c243f1b7de424fa96e5452bd8e2587b0b0

// router.post(
//     "/anularRetencionIvaIslr",
//     // verificaToken,
//     // verificaAutorizacionAdmin,
//     ctrl.postAnularRetencionIvaIslrController,
// );

<<<<<<< HEAD
export default router;
=======
// export default router;
>>>>>>> 933874c243f1b7de424fa96e5452bd8e2587b0b0
