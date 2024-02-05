'use strict';

const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

import('./loadEnvironment.mjs');
const router = require('./routes/profile');

// set the view engine to ejs
app.set('view engine', 'ejs');
app.use(express.json());

// routes
app.use('/', router);

// start server
const server = app.listen(port);

// log when server starts
console.log('Express started. Listening on %s', port);

// export server
module.exports = server;
