'use strict';

angular.module('copayAddon.coloredCoins')
    .controller('assetsController', function (
      $rootScope,
      $scope,
      $timeout,
      $ionicModal,
      platformInfo,
      coloredCoins
    ) {
      var self = this;

      this.assets = coloredCoins.assets;
      this.error = coloredCoins.error;

      var disableAssetListener = $rootScope.$on('ColoredCoins/AssetsUpdated', function (event, assets) {
        self.assets = assets;
      });

      var disableErrorListener = $rootScope.$on('ColoredCoins/Error', function (event, errorMsg) {
        self.error = errorMsg;
      });

      var disableOngoingProcessListener = $rootScope.$on('Addon/OngoingProcess', function(e, name) {
        self.setOngoingProcess(name);
      });

      $scope.$on('$destroy', function () {
        disableAssetListener();
        disableOngoingProcessListener();
        disableErrorListener();
      });

      this.setOngoingProcess = function(name) {
        var self = this;
        self.blockUx = !!name;

        if (platformInfo.isCordova) {
          if (name) {
            window.plugins.spinnerDialog.hide();
            window.plugins.spinnerDialog.show(null, name + '...', true);
          } else {
            window.plugins.spinnerDialog.hide();
          }
        } else {
          self.onGoingProcess = name;
          $timeout(function() {
            $rootScope.$apply();
          });
        }
      };

      // show ongoing process if any
      this.setOngoingProcess(coloredCoins.onGoingProcess);

      this.openAssetModal = function (asset) {
        $scope.asset = asset;
        $ionicModal.fromTemplateUrl('views/coloredcoins/modals/asset-details.html', {
          scope: $scope
        }).then(function(modal) {
          $scope.assetDetailsModal = modal;
          $scope.assetDetailsModal.show();
        });
      };

      this.openIssueModal = function () {
        $ionicModal.fromTemplateUrl('views/coloredcoins/modals/issue.html', {
          controller: AssetIssueController
        }).then(function(modal) {
          $scope.issueAssetModal = modal;
          $scope.issueAssetModal.show();
        });
      };
    });
