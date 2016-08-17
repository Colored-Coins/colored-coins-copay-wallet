'use strict';

/*
  Replace Copay's splash and disclaimer screens with single landing page
 */

angular.module('copayAddon.coloredCoins').config(function ($stateProvider) {

  $stateProvider.decorator('views', function (state, parent) {
    var views = parent(state);

    // replace both default 'splash' and 'disclaimer' states with a single one
    if (state.name == 'splash' || state.name == 'disclaimer') {
      views['main@'].templateUrl = 'colored-coins/views/landing.html';
      views['main@'].controller = function($scope, $timeout, $log, profileService, storageService, applicationService) {
        storageService.getCopayDisclaimerFlag(function(err, val) {
          $scope.agreed = val;
          $timeout(function() {
            $scope.$digest();
          }, 1);
        });

        $scope.goHome = function() {
          applicationService.restart();
        };

        $scope.agreeAndCreate = function(noWallet) {
          storageService.setCopayDisclaimerFlag(function(err) {

            if (profileService.profile) {
              $timeout(function() {
                applicationService.restart();
              }, 1000);
              return;
            }

            $scope.creatingProfile = true;

            profileService.create({
              noWallet: noWallet
            }, function(err) {
              if (err) {
                $scope.creatingProfile = false;
                $log.warn(err);
                $scope.error = err;
                $scope.$apply();
                $timeout(function() {
                  $scope.create(noWallet);
                }, 3000);
              }
            });
          });

        };
      }

    }

    return views;
  });

});