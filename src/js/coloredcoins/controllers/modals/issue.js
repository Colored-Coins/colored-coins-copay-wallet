'use strict';

var AssetIssueController = function ($rootScope, $scope, $timeout, $log, coloredCoins, gettext,
                                     profileService, feeService, lodash, bitcore, txStatus, ccConfig, Upload, ccFeeService, configService) {

  ProcessingTxController.call(this, $rootScope, $scope, $timeout, $log, coloredCoins, gettext, profileService, feeService,
      lodash, bitcore, txStatus);

  var self = this;

  $scope.issuance = {
    userData: []
  };

  $scope.estimatedCost = '...';

  ccFeeService.estimateCostOfIssuance(function(err, fee, totalCost) {
    if (err) {
      return self._handleError(err);
    }
    var config = configService.getSync().wallet.settings;
    $scope.estimatedCost = profileService.formatAmount(totalCost) + ' ' + config.unitName;
    $scope.$digest();
  });

  $scope.addField = function() {
    $scope.issuance.userData.push({ name: '', value: ''});
  };

  $scope.removeField = function(field) {
    lodash.pull($scope.issuance.userData, field);
  };

  $scope.cancel = function () {
    $scope.issueAssetModal.hide();
  };

  var createAsset = function(issuance, iconData) {
    self.setOngoingProcess(gettext('Creating issuance transaction'));
    coloredCoins.createIssueTx(issuance, function (err, result) {
      if (err) {
        self._handleError(err);
      }

      var customData = {
        asset: {
          action: 'issue',
          assetName: issuance.assetName,
          icon: iconData ? iconData.url : null,
          amount: issuance.amount
        }
      };
      self._createAndExecuteProposal(result.txHex, result.issuanceUtxo.address, customData);
    });
  };

  var createAssetWithIcon = function(issuance, icon) {
    Upload.upload({
      url: ccConfig.uploadHost + '/upload',
      file: icon
    }).success(function (iconData, status, headers, config) {
      if (!iconData.url || iconData.url.indexOf('https://s3') != 0) {
        console.log('Error uploading: ' + status + ' ' + iconData);
        return self._handleError({ error: 'Failed to upload icon'});
      }
      console.log('Icon uploaded. URL: ' + iconData);
      issuance.urls = [
        {
          name: "icon",
          url: iconData.url,
          mimeType: iconData.mimeType
        }];
      createAsset(issuance, iconData);
    }).error(function (data, status, headers, config) {
      console.log('error uploading icon: ' + status + " " + data);
      self._handleError({ error: "Failed to upload icon" });
    })
  };

  $scope.issueAsset = function (form) {
    if (form.$invalid) {
      this.error = gettext('Unable to send transaction proposal');
      return;
    }

    var fc = profileService.focusedClient;
    if (fc.isPrivKeyEncrypted()) {
      profileService.unlockFC(function (err) {
        if (err) return self._setError(err);
        return $scope.issueAsset(form);
      });
      return;
    }

    if (this.file) {
      createAssetWithIcon(this.issuance, this.file);
    } else {
      createAsset(this.issuance);
    }
  };
};

AssetIssueController.prototype = Object.create(ProcessingTxController.prototype);

angular.module('copayAddon.coloredCoins').controller('assetIssueController', AssetIssueController);
