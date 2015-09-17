// create the angular main module

var app = angular.module("socketPollsClient", []);

// create a service to handle receiving and sending Socket.IO events

app.service("socketConnection", function () {

    // Check socket.io-client issue #812
    var socket = io(window.location.origin + "/users");

    // callbacks of external events must be run inside $apply to ensure the
    // changes to the scope are propagated to the view

    return {
        on: function (event, scope, callback) {
            socket.on(event, function (data) {
                scope.$apply(function () {
                    callback(data);
                });
            });
        },

        emit: function (event, data, scope, callback) {
            socket.emit(event, data, function (response) {
                if (callback) {
                    scope.$apply(function () {
                        callback(response);
                    });
                }
            });
        }
    };
});

// create a controller to display connection status and users count

app.controller("ConnectionController", function ($scope, socketConnection) {

    $scope.state = "disconnected";
    socketConnection.on("connect", $scope, function () {
        $scope.state = "connected";
    });
    socketConnection.on("disconnect", $scope, function () {
        $scope.state = "disconnected";
    });

    $scope.connectedUsers = 0;
    socketConnection.on("connected users", $scope, function (count) {
        $scope.connectedUsers = count;
    });
});

// create controller to display the poll and select an answer

app.controller("PollController", function ($scope, socketConnection) {

    function init() {
        $scope.pollData = {};
    }

    init();

    socketConnection.on("new poll", $scope, function (pollData) {
        $scope.pollData = pollData;
    });

    socketConnection.on("reset poll", $scope, function () {
        init();
    });

    socketConnection.on("updated poll", $scope, function (pollData) {
        var userAnswer = $scope.pollData.answer;
        if (userAnswer === undefined) {
            return;
        }
        $scope.pollData = pollData;
        $scope.pollData.answer = userAnswer;
    });

    $scope.setAnswer = function (answer) {
        socketConnection.emit("answer poll", answer, $scope, function (success) {
            if (!success) {
                return;
            }
            $scope.pollData.answer = answer;
        });
    };
});
