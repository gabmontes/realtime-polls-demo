// Express and Socket.IO server

var express = require("express");
var socketio = require("socket.io");
var session = require("express-session");

var COOKIE_MAX_AGE = 15 * 60 * 1000; // 15 min
var COOKIE_SECRET = "Shhhh! This is my secret...";
var SERVER_PORT = 4000;

// setup session middleware

var sessionMiddleware = session({
    cookie: {
        maxAge: COOKIE_MAX_AGE
    },
    resave: false,
    rolling: true,
    saveUninitialized: true,
    secret: COOKIE_SECRET
});

// create and configure web server

var app = express();
app.use(sessionMiddleware);
app.use(express.static("public"));

// start web server

var server = app.listen(SERVER_PORT, function () {
    console.log("Server listening on port %s", SERVER_PORT);
});

// create Socket.IO server on top of the web server

var io = socketio(server);

// module interface

module.exports = {
    attach: function (handler) {
        handler.init(io, sessionMiddleware);
    }
};
