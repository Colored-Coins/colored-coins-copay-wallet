'use strict';

var AssetTransferController = function ($rootScope, $scope, $timeout, $log, coloredCoins, gettext,
                                        profileService, lodash, bitcore, txStatus, walletService,
                                        configService, txFormatService, ongoingProcess, $ionicModal) {

  ProcessingTxController.call(this, $rootScope, $scope, $timeout, $log, coloredCoins, gettext, profileService,
      lodash, bitcore, txStatus, walletService, configService, txFormatService, ongoingProcess, $ionicModal);

  var self = this;

  $scope.onQrCodeScanned = function (data) {
    this.error = '';
    var form = this.assetTransferForm;
    if (data) {
      form.address.$setViewValue(new bitcore.URI(data).address.toString());
      form.address.$isValid = true;
      form.address.$render();
      $scope.lockAddress = true;
    }

    if (form.address.$invalid) {
      $scope.resetError();
      $scope.lockAddress = false;
      $scope._address = null;
      this.error = gettext('Could not recognize a valid Bitcoin QR Code');
    }
  };

  $scope.cancel = function () {
    console.log($scope.assetTransferModal);
    $scope.assetTransferModal.hide();
  };

  $scope.transferAsset = function (transfer, form) {
    if ($scope.asset.locked) {
      self._setError({ message: "Cannot transfer locked asset" });
      return;
    }
    $log.debug("Transfering " + transfer._amount + " units(s) of asset " + $scope.asset.asset.assetId + " to " + transfer._address);

    if (form.$invalid) {
      this.error = gettext('Unable to send transaction proposal');
      return;
    }

    self.setOngoingProcess(gettext('Creating transfer transaction'));
    coloredCoins.createTransferTx($scope.asset, transfer._amount, transfer._address, function (err, result) {
      if (err) {
        self._handleError(err);
      }

      var customData = {
        asset: {
          action: 'transfer',
          assetId: $scope.asset.asset.assetId,
          assetName: $scope.asset.metadata.assetName,
          icon: $scope.asset.icon,
          utxo: lodash.pick($scope.asset.utxo, ['txid', 'index']),
          amount: transfer._amount
        }
      };
      self._createAndExecuteProposal(result.txHex, transfer._address, customData);
    });
  };
};

AssetTransferController.prototype = Object.create(ProcessingTxController.prototype);

angular.module('copayAddon.coloredCoins').controller('assetTransferController', AssetTransferController);
