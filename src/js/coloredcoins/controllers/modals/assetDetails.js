'use strict';

angular.module('copayAddon.coloredCoins')
    .controller('assetDetailsController', function (
      $rootScope,
      $scope,
      $ionicModal,
      profileService,
      insight
    ) {

  insight = insight.get();
  insight.getTransaction($scope.asset.issuanceTxid, function (err, tx) {
    if (!err) {
      $scope.issuanceTx = tx;
    }
  });

  $scope.openTransferModal = function () {
    $ionicModal.fromTemplateUrl('views/coloredcoins/modals/send.html', {
      scope: $scope
    }).then(function(modal) {
      $scope.assetTransferModal = modal;
      $scope.assetTransferModal.show();
    });
  };

  $scope.openBlockExplorer = function () {
    var url = 'http://coloredcoins.org/explorer/';
    var networkSuffix = profileService.focusedClient.credentials.network == 'testnet' ? 'testnet/' : '';
    $rootScope.openExternalLink(url + networkSuffix + 'tx/' + $scope.asset.issuanceTxid);
  };

  $scope.cancel = function () {
    $scope.assetDetailsModal.hide();
  };


});
