const twilio = require('twilio');
const Router = require('express').Router;
const ivrRouter = require('./ivr/router');
require('dotenv').config();

const shouldValidate = process.env.NODE_ENV !== 'test';

const router = new Router();

// GET: / - home page
router.get('/', (req, res) => {
  res.render('index');
});

router.use('/ivr', twilio.webhook({validate: shouldValidate}), ivrRouter);

module.exports = router;
