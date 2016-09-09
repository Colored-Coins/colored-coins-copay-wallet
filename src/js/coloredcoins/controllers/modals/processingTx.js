'use strict';

function ProcessingTxController(
  $rootScope,
  $scope,
  $timeout,
  $log,
  coloredCoins,
  gettext,
  profileService,
  lodash,
  bitcore,
  txStatus,
  walletService,
  configService,
  txFormatService,
  ongoingProcess,
  $ionicModal
) {
  this.$rootScope = $rootScope;
  this.profileService = profileService;
  this.$log = $log;
  this.gettext = gettext;
  this.bitcore = bitcore;
  this.coloredCoins = coloredCoins;
  this._ = lodash;
  this.$scope = $scope;
  this.$timeout = $timeout;
  this.txStatus = txStatus;
  this.walletService = walletService;
  this.configService = configService;
  this.txFormatService = txFormatService;
  this.ongoingProcess = ongoingProcess;
  this.$ionicModal = $ionicModal;

  var config = configService.getSync();
  this.configWallet = config.wallet;
  this.walletSettings = this.configWallet.settings;

  var self = this;

  $scope.error = '';

  $scope.color = profileService.focusedClient.backgroundColor;

  $scope.resetError = function () {
    self.error = self.success = null;
  };
}

ProcessingTxController.prototype.setOngoingProcess = function (name) {
  this.$rootScope.$emit('Addon/OngoingProcess', name);
};

ProcessingTxController.prototype._setError = function (err) {
  var fc = this.profileService.focusedClient;
  this.$log.warn(err);
  var errMessage = fc.credentials.m > 1
      ? this.gettext('Could not create transaction proposal')
      : this.gettext('Could not perform transaction');

  //This are abnormal situations, but still err message will not be translated
  //(the should) we should switch using err.code and use proper gettext messages
  err.message = err.error ? err.error : err.message;
  errMessage = errMessage + '. ' + (err.message ? err.message : this.gettext('Check you connection and try again'));

  this.$scope.error = errMessage;

};

ProcessingTxController.prototype._handleError = function(err) {
  this.setOngoingProcess();
  return this._setError(err);
};

ProcessingTxController.prototype._signAndBroadcast = function (txp, cb) {
  var self = this,
  		fc = self.profileService.focusedClient;
  self.setOngoingProcess(self.gettext('Signing transaction'));
  fc.signTxProposal(txp, function (err, signedTx) {
    self.setOngoingProcess();
    if (err) {
      err.message = self.gettext('Transaction was created but could not be signed. Please try again from home screen.') + (err.message ? ' ' + err.message : '');
      return cb(err);
    }

    if (signedTx.status == 'accepted') {
      self.setOngoingProcess(self.gettext('Broadcasting transaction'));
      fc.broadcastTxProposal(signedTx, function (err, btx, memo) {
        self.setOngoingProcess();
        if (err) {
          err.message = self.gettext('Transaction was signed but could not be broadcasted. Please try again from home screen.') + (err.message ? ' ' + err.message : '');
          return cb(err);
        }

        return cb(null, btx);
      });
    } else {
      self.setOngoingProcess();
      return cb(null, signedTx);
    }
  });
};

ProcessingTxController.prototype._openStatusModal = function(type, txp, cb) {
  var self = this;
  var fc = this.profileService.focusedClient;
  self.$scope.type = type;
  self.$scope.tx = this.txFormatService.processTx(txp);
  self.$scope.color = fc.backgroundColor;
  self.$scope.cb = cb;

  var txStatusUrl = 'views/modals/tx-status.html';
  if (txp.customData && txp.customData.asset) {
    if (txp.customData.asset.action == 'transfer') {
      txStatusUrl = 'views/coloredcoins/modals/transfer-status.html';
    } else {
      txStatusUrl = 'views/coloredcoins/modals/issue-status.html';
    }
  }

  self.$ionicModal.fromTemplateUrl(txStatusUrl, {
    scope: self.$scope,
    animation: 'slide-in-up'
  }).then(function(modal) {
    self.$scope.txStatusModal = modal;
    self.$scope.txStatusModal.show();
  });
};

ProcessingTxController.prototype._handleEncryptedWallet = function(client, cb) {
  if (!this.walletService.isEncrypted(client)) return cb();
  this.$rootScope.$emit('Local/NeedsPassword', false, function(err, password) {
    if (err) return cb(err);
    return cb(self.walletService.unlock(client, password));
  });
};

ProcessingTxController.prototype._closeModal = function() {
  this.$scope.cancel();
  this.$rootScope.$emit('ColoredCoins/TxComplete');
};


ProcessingTxController.prototype._confirmTx = function(txp) {
  var client = this.profileService.focusedClient;
  var self = this;

  self._handleEncryptedWallet(client, function(err) {
    if (err) {
      return self._setError(err);
    }

    self.ongoingProcess.set('sendingTx', true);
    self.walletService.publishTx(client, txp, function(err, publishedTxp) {
      self.ongoingProcess.set('sendingTx', false);
      if (err) {
        return self._setError(err);
      }

      self.ongoingProcess.set('signingTx', true);
      self.walletService.signTx(client, publishedTxp, function(err, signedTxp) {
        self.ongoingProcess.set('signingTx', false);
        self.walletService.lock(client);
        if (err) {
          self.$scope.$emit('Local/TxProposalAction');
          return self._setError(
            err.message ?
            err.message :
            gettext('The payment was created but could not be completed. Please try again from home screen'));
        }

        if (signedTxp.status == 'accepted') {
          self.ongoingProcess.set('broadcastingTx', true);
          self.walletService.broadcastTx(client, signedTxp, function(err, broadcastedTxp) {
            self.ongoingProcess.set('broadcastingTx', false);
            if (err) {
              return self._setError(err);
            }
            self._closeModal();
            var type = self.txStatus.notify(broadcastedTxp);
            self._openStatusModal(type, broadcastedTxp, function() {
              self.$scope.$emit('Local/TxProposalAction', broadcastedTxp.status == 'broadcasted');
            });
          });
        } else {
          self._closeModal();
          var type = self.txStatus.notify(signedTxp);
          self._openStatusModal(type, signedTxp, function() {
            self.$scope.$emit('Local/TxProposalAction');
          });
        }
      });
    });
  });
};

ProcessingTxController.prototype._createAndExecuteProposal = function (txHex, toAddress, customData) {
  var self = this;
  var client = self.profileService.focusedClient;
  var tx = new self.bitcore.Transaction(txHex);
  self.$log.debug(JSON.stringify(tx.toObject(), null, 2));

  var inputs = self._.map(tx.inputs, function (input) {
    input = input.toObject();
    input = self.coloredCoins.txidToUTXO[input.prevTxId + ":" + input.outputIndex];
    input.outputIndex = input.vout;
    return input;
  });

  // drop change output provided by CC API. We want change output to be added by BWS in according with wallet's
  // fee settings
  var outputs = self._.chain(tx.outputs)
      .map(function (o) {
        return { script: o.script.toString(), amount: o.satoshis };
      })
      .dropRight()
      .value();

  // for Copay to show recipient properly
  outputs[0].toAddress = toAddress;

  self.setOngoingProcess(self.gettext('Creating tx proposal'));
  var txp = {};

  txp.type = 'external';
  txp.inputs = inputs;
  txp.outputs = outputs;
  txp.validateOutputs = false;
  txp.noShuffleOutputs = true;
  txp.message = null;
  txp.payProUrl = null;
  txp.feeLevel = self.walletSettings.feeLevel || 'normal';
  txp.customData = customData;

  self.walletService.createTx(client, txp, function(err, createdTxp) {
    self.ongoingProcess.set('creatingTx', false);
    if (err) {
      return self._setError(err);
    }

    if (!client.canSign() && !client.isPrivKeyExternal()) {
      self.$log.info('No signing proposal: No private key');
      self.ongoingProcess.set('sendingTx', true);
      self.walletService.publishTx(client, createdTxp, function(err, publishedTxp) {
        self.ongoingProcess.set('sendingTx', false);
        if (err) {
          return self._setError(err);
        }
        self._closeModal();
        var type = self.txStatus.notify(createdTxp);
        self._openStatusModal(type, createdTxp, function() {
          return self.$scope.$emit('Local/TxProposalAction');
        });
      });
    } else {
      self.$rootScope.$emit('Local/NeedsConfirmation', createdTxp, function(accept) {
        if (accept) self._confirmTx(createdTxp);
        else self.$scope.cancel();
      });
    }
  });
};
