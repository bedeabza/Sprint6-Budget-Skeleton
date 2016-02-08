var app = angular.module('workshop3', ['ngRoute', 'ui.bootstrap']);
var errorHandler = function(err) {
    alert('Problem!');
};

app.config(function($routeProvider, $locationProvider) {
    $locationProvider.html5Mode({
        enabled: true,
        requireBase: false
    });

    $routeProvider.when('/receive', {
        templateUrl: '/pages/add.html',
        controller: 'AddCtrl',
        resolve: {type: function() {return 'receive';}}
    });

    $routeProvider.when('/spend', {
        templateUrl: '/pages/add.html',
        controller: 'AddCtrl',
        resolve: {type: function() {return 'spend';}}
    });

    $routeProvider.otherwise({
        templateUrl: '/pages/index.html'
    });
});

app.controller('AddCtrl', function($scope, type, TransactionStore, $location) {
    $scope.title = type[0].toUpperCase() + type.substr(1);
    $scope.submitting = false;

    $scope.data = {
        date: null,
        amount: null,
        description: null
    };

    $scope.submit = function() {
        if (!$scope.submitting) {
            $scope.submitting = true;

            var data = JSON.parse(JSON.stringify($scope.data));

            if (!data.date) {
                delete data.date;
            }

            if (type == 'spend') {
                data.amount = -data.amount;
            }

            TransactionStore.add(data).then(
                function() {
                    $scope.submitting = false;
                    $location.path('/');
                },
                function() {
                    $scope.submitting = false;
                    errorHandler();
                }
            );
        }
    };
});

app.controller('IndexCtrl', function($scope, TransactionStore) {
    $scope.current = moment();
    $scope.list = [];
    $scope.state = 'both';

    $scope.getMonthFormatted = function(date) {
        return moment(date).format('Do @ HH:mm');
    };

    $scope.getRowClass = function(item) {
        if ($scope.state != 'both') {
            return '';
        }

        return item.amount < 0 ? 'red' : 'green';
    };

    $scope.setState = function(val) {
        $scope.state = val;
    };

    $scope.formatAmount = function(val) {
        if ($scope.state == 'both') {
            return val < 0 ? val : '+' + val.toString();
        } else {
            return Math.abs(val);
        }
    };

    $scope.delete = function(item) {
        if (confirm('Are you sure?')) {
            TransactionStore.delete(item.id).then(
                $scope.loadData,
                errorHandler
            );
        }
    };

    $scope.loadData = function() {
        TransactionStore.getTransactionsInMonth($scope.current.format('YYYY-MM')).then(
            function(list) {
                $scope.list = list;
            },
            errorHandler
        );
    };

    $scope.$on('ChangedCurrentPage', function(e, val) {
        $scope.current = val;
        $scope.loadData();
    });
});

app.controller('BalanceCtrl', function($scope) {
    $scope.balance = function() {
        var total = 0;

        for (var i in $scope.list) {
            total += $scope.list[i].amount;
        }

        return total;
    };
});

app.controller('PaginationCtrl', function($scope, $rootScope, $timeout) {
    var today = moment();
    var no = 4;

    var generateMonths = function() {
        var current = moment($scope.pivot);

        $scope.list = [];

        for (var i = 0;i < no;i++) {
            $scope.list.push(current);

            current = moment(current);
            current.subtract(1, 'month');
        }
    };

    $scope.list = [];
    $scope.current = moment(today);
    $scope.pivot = moment(today);

    $scope.setCurrentItem = function(item) {
        $scope.current = item;
    };

    $scope.canPrev = function() {
        return $scope.pivot.format('YY-MM') !== today.format('YY-MM');
    };

    $scope.prev = function() {
        if ($scope.canPrev()) {
            $scope.pivot.add(1, 'month');
        }
    };

    $scope.next = function() {
        $scope.pivot.subtract(1, 'month');
    };

    $scope.$watch('pivot', generateMonths, true);

    $scope.$watch('current', function(val) {
        $rootScope.$broadcast('ChangedCurrentPage', val);
    });
});

app.filter('stateFilter', function() {
    return function(list, state) {
        if (state == 'both') {
            return list;
        }

        var newList = [];
        angular.forEach(list, function(item) {
            if (
                (item.amount < 0 && state == 'spendings') ||
                (item.amount >= 0 && state == 'income')
            ) {
                newList.push(item);
            }
        });

        return newList;
    };
})

app.factory('TransactionStore', function($http, $q) {
    return (function() {
        var URL = 'http://server.godev.ro:8080/api/dragos/transactions';

        var getTransactionsInMonth = function(month) {
            return $q(function(resolve, reject) {
                $http({url: URL + '?month=' + month})
                    .then(
                        function(xhr) {
                            if (xhr.status == 200) {
                                resolve(xhr.data);
                            } else {
                                reject();
                            }
                        },
                        reject
                    );
            });
        };

        var add = function(data) {
            return $q(function(resolve, reject) {
                $http({
                    url: URL,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    data: JSON.stringify(data)
                })
                .then(
                    function(xhr) {
                        if (xhr.status == 201) {
                            resolve(xhr.data);
                        } else {
                            reject();
                        }
                    },
                    reject
                );
            });
        };

        var del = function(id) {
            return $q(function(resolve, reject) {
                $http({
                    url: URL + '/' + id,
                    method: 'DELETE'
                })
                .then(
                    function(xhr) {
                        if (xhr.status == 204) {
                            resolve();
                        } else {
                            reject();
                        }
                    },
                    reject
                );
            });
        };

        return {
            getTransactionsInMonth: getTransactionsInMonth,
            add: add,
            delete: del
        };
    })();
});
