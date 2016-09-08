'use strict';

angular.module('copayAddon.coloredCoins').config(function ($provide) {

  $provide.decorator('logoDirective', function($delegate) {
    var directive = $delegate[0];
    var ctrl = directive.controller;
    directive.controller = function($scope) {
      ctrl.apply(this, arguments);

      // CC logo should be 1.5 times wider than Copay.
      // if width is not specified, show CC logo full size (220px) and scale down Copay logo to maintain
      // 1.5 ratio between logos
      if ($scope.width) {
        var logo_width = $scope.width * 1.5;
        var logo_height = logo_width / (220 / 43);
        $scope.copay_logo_style = 'width: ' + $scope.width + 'px;';
        $scope.logo_style = "background-size: " + logo_width + "px " + logo_height + "px;" +
            "width: " + logo_width + "px; height: " + logo_height + "px;";
      } else {
        var copay_width = 100 / 1.5 + '%';
        $scope.copay_logo_style = 'width: ' + copay_width + '%; max-width: 147px';
        $scope.logo_style = "background-size: 100% auto; width: 100%; max-width: 220px; height: 43px;";
      }
    };
    directive.template = '' +
        '<div class="cc-logo-holder" ng-class="{ \'negative\' : negative, \'inline\' : width < 50, }">' +
          '<img ng-src="{{ logo_url }}" alt="Copay" style="{{ copay_logo_style }}">' +
          '<div class="cc-plus">+</div>' +
          '<div class="cc-logo" style="{{ logo_style }}"></div>' +
        '</div>';
    return $delegate;
  });

});