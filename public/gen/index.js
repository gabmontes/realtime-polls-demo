// create the angular main module

var app = angular.module("socketPollsGenerator", []);

// create a service to handle receiving and sending Socket.IO events

app.service("socketConnection", function () {

    // Check socket.io-client issue #812
    var socket = io(window.location.origin + "/generators");

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

// create controller to create, send and receive poll results

app.controller("PollController", function ($scope, socketConnection) {

    function getFilteredOptions () {
        return $scope.pollData.options.filter(function (option) {
            return option.text;
        });
    }

    function getSanitizeOptions() {
        return $scope.pollData.options.map(function (option) {
            return {
                text: option.text,
                count: option.count
            };
        });
    }

    function filterEmptyOptions() {
        $scope.pollData.options = getFilteredOptions();
    }

    function addEmptyOption() {
        $scope.pollData.options.push({
            text: "",
            count: 0
        });
    }

    function init() {
        $scope.pollRunning = false;
        $scope.pollData = {
            options: []
        };
        addEmptyOption();
    }

    socketConnection.on("connect", $scope, function () {
        init();
    });

    socketConnection.on("updated poll", $scope, function (pollData) {
        $scope.pollData = pollData;
        $scope.pollRunning = true;
    });

    $scope.addOption = function () {
        filterEmptyOptions();
        addEmptyOption();
    };

    $scope.canSendPoll = function () {
        if (!$scope.pollData.question) {
            return false;
        }
        if (!getFilteredOptions().length) {
            return false;
        }
        return true;
    };

    $scope.sendPoll = function () {
        if ($scope.canSendPoll) {
            $scope.pollData.options = getSanitizeOptions();
            socketConnection.emit("new poll", $scope.pollData, $scope, function () {
                $scope.pollRunning = true;
            });
        }
    };

    $scope.newPoll = function () {
        socketConnection.emit("reset poll", {}, $scope, function () {
            init();
        });
    };
});
