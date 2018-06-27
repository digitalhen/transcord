const app = require('./app');
const config = require('./config');

require('./src/helpers/connectionHelper');

// TODO: note about connecting to database

const server = app.listen(config.port, function() {
  console.log('Express server listening on port ' + server.address().port);
});

module.exports = server;
