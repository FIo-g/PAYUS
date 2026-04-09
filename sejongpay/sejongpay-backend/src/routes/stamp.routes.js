// src/routes/stamp.routes.js
const router = require('express').Router();
const { authenticate } = require('../middlewares/auth');
const ctrl = require('../controllers/stamp.controller');

router.use(authenticate);
router.get('/', ctrl.getMyStamps);
router.get('/:merchantId', ctrl.getStampByMerchant);
router.post('/:id/redeem', ctrl.redeemStamp);

module.exports = router;
