// Socket.IO handlers

function init(io, session) {

    // create namespaces for users and generators

    var userSockets = io.of("/users");
    var generatorSockets = io.of("/generators");

    // set middleware to import Express.js session into the socket

    userSockets.use(function(socket, next) {
        session(socket.handshake, {}, next);
    });

    // count of connected users

    var users = 0;

    // current active poll

    var activePoll = null;

    // empty map to store every user's vote for current poll

    var votes = {};

    // handle user connections

    userSockets.on("connection", function (socket) {

        // helper to notify count of connected users

        function notifyConnectedUsers(count) {
            console.log("%s users connected", count);
            userSockets.emit("connected users", count);
            generatorSockets.emit("connected users", users);
        }

        // increase the count of users and notify

        notifyConnectedUsers(++users);

        // keep track of current session data
        // users are identified by their session id

        var session = socket.handshake.session;

        // mix active poll with user's vote

        function resendActivePoll() {
            socket.emit("new poll", {
                question: activePoll.question,
                options: activePoll.options,
                answer: votes[session.id]
            });
        }

        // send the active poll to the user, if any

        if (activePoll) {
            resendActivePoll();
        }

        // handle the answer to the current poll

        socket.on("answer poll", function (answer, callback) {

            // prevent double voting

            if (votes[session.id] !== undefined) {
                console.log("User %s already voted", session.id);

                // reject the event received

                callback(false);

                // send the poll back with the original vote

                resendActivePoll();

                return;
            }

            console.log("User %s voted %s", session.id, answer);

            // update poll votes count

            var option = activePoll.options[answer];
            option.count = (option.count || 0) + 1;

            activePoll.answers = activePoll.options.reduce(function (sum, option) {
                return sum + (option.count || 0);
            }, 0);

            // keep track of the vote

            votes[session.id] = answer;

            // notify the vote was successfull

            callback(true);

            // broadcast the new poll results

            userSockets.emit("updated poll", activePoll);
            generatorSockets.emit("updated poll", activePoll);
        });

        // decrease the count of users and notify on disconnect

        socket.on("disconnect", function () {
            notifyConnectedUsers(--users);
        });
    });

    // set generator authorization middleware to accept only one concurrent
    // connection

    var genConnected = false;

    generatorSockets.use(function (socket, next) {
        if (genConnected) {
            next(new Error("Unauthorized"));
            return;
        }
        next();
    });

    // handle generator connections

    generatorSockets.on("connection", function (socket) {

        console.log("Generator connected");

        // flag connection to avoid more than one generator

        genConnected = true;

        // notify current connected users count

        socket.emit("connected users", users);

        // restore generator state

        if (activePoll) {
            socket.emit("updated poll", activePoll);
        }

        // helper to send to the users the events received from the generator

        function resendToUsers(event, postback) {

            // listen to an event

            socket.on(event, function (data, callback) {

                // resend the event to users

                userSockets.emit(event, data);
                console.log("Event %s sent to users with %j", event, data);

                // send acknowledge to the generator

                callback();

                // trigger any local post processing

                postback(data);
            });
        }

        // resend events and update local poll state

        resendToUsers("new poll", function (pollData) {
            activePoll = pollData;
        });
        resendToUsers("reset poll", function () {
            activePoll = null;
            votes = {};
        });

        // listen for disconnection to allow a new generator to connect

        socket.on("disconnect", function () {
            genConnected = false;
        });
    });
}

// module interface

module.exports = {
    init: init
};
