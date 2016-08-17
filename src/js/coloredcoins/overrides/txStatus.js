'use strict';

angular.module('copayAddon.coloredCoins').config(function ($provide) {

  $provide.decorator('txStatus', function($delegate) {
    var defaultTemplateUrl = $delegate._templateUrl;
    $delegate._templateUrl = function(type, txp) {
      if (txp.customData && txp.customData.asset) {
        return txp.customData.asset.action == 'transfer'
            ? 'colored-coins/views/modals/transfer-status.html'
            : 'colored-coins/views/modals/issue-status.html';
      }
      return defaultTemplateUrl(type, txp);
    };
    return $delegate;
  });
});