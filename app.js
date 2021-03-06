let config = require('./env.json')[process.env.NODE_ENV || "development"];
const express = require('express');
const path = require('path');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const router = require('./routes/index');
const app = express();
var session = require('express-session');
var MemoryStore = require('memorystore')(session);

// storage root of project
global.__basedir = __dirname;

// add moment to Locals
app.locals.moment = require('moment');

// app startup
console.log('Starting up in ' + process.env.NODE_ENV + ' mode');
require('./helpers/connectionHelper');

const server = app.listen(config.port, function() {
  console.log('Express server listening on port ' + server.address().port);
});

module.exports = server;

// authentication startup
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

app.use(session({
    secret: config.mongo_secret,
    store: new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

var User = require('./models/user');
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// view engine setup
app.set('views', path.join(__dirname, 'views/' + config.template));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(require('stylus').middleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

app.use(router);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  // TO DO: handle logs better... feeds errors to the logs
  console.log(err);

  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: (app.get('env') === 'development' || app.get('env') === 'test') ? err : {},
  });
});

module.exports = app;