'use strict';

angular.module('copayAddon.coloredCoins')
    .directive('booleanIcon', function() {
      return {
        restrict: 'E',
        scope: {
          value: '='
        },
        replace: true,
        template: '<span>' +
                    '<i class="fi-check" style="color:green" ng-show="value"></i>' +
                    '<i class="fi-x" style="color:red" ng-show="!value"></i>' +
                  '</span>'
      }
    });
