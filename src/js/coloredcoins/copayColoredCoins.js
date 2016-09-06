'use strict';

var module = angular.module('copayAddon.coloredCoins', ['ngFileUpload']);

angular.module('copayAddon.coloredCoins')
    .value('ccConfig', {
        api: {
          testnet: 'http://localhost:8000',
          livenet: 'http://localhost:8100'
        },
        uploadHost: 'http://localhost:8200'
      });

module
    .config(function ($stateProvider) {
      $stateProvider
          .state('assets', {
            url: '/assets',
            walletShouldBeComplete: true,
            needProfile: true,
            views: {
              'main': {
                templateUrl: 'views/coloredcoins/assets.html'
              }
            }
          });
    })
    .run(function (addonManager, coloredCoins, $state) {
      addonManager.registerAddon({
        formatPendingTxp: function(txp) {
          if (txp.customData && txp.customData.asset) {
            var value = txp.amountStr;
            var asset = txp.customData.asset;
            txp.amountStr = asset.amount + " unit" + (asset.amount > 1 ? "s" : "") + " of " + asset.assetName + " (" + value + ")";
            txp.showSingle = true;
            txp.toAddress = txp.outputs[0].toAddress; // txproposal
            txp.address = txp.outputs[0].address;     // txhistory
          }
        },
        txTemplateUrl: function() {
          return 'views/coloredcoins/includes/transaction.html';
        }
      });
    });
