'use strict';

angular.module('copayAddon.coloredCoins').config(function ($provide) {

  $provide.decorator('availableBalanceDirective', function($delegate) {
    var directive = $delegate[0];
    directive.controller = function($rootScope, $scope, profileService, configService, lodash) {
      var config = configService.getSync().wallet.settings;
      $rootScope.$on('ColoredCoins/AssetsUpdated', function(event, assets) {
        var coloredBalanceSat = lodash.reduce(assets, function(total, asset) {
          total += asset.utxo.value;
          return total;
        }, 0);

        var availableBalanceSat = $scope.index.availableBalanceSat - coloredBalanceSat;
        $scope.availableBalanceStr = profileService.formatAmount(availableBalanceSat) + ' ' + config.unitName;
        $scope.coloredBalanceStr = profileService.formatAmount(coloredBalanceSat) + ' ' + config.unitName;
      });
    };
    directive.templateUrl = 'views/coloredcoins/includes/available-balance.html';
    return $delegate;
  });

});
