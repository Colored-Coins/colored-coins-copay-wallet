'use strict';

function ColoredCoins($rootScope, profileService, ccFeeService, bitcore, $http, $log, lodash) {
  var root = {},
      lockedUtxos = [],
      self = this;

  // UTXOs "cache"
  root.txidToUTXO = {};
  root.assets = null;
  root.error = null;

  var disableFocusListener = $rootScope.$on('Local/NewFocusedWallet', function() {
    root.assets = null;
    root.error = null;
  });

  var _setOngoingProcess = function(name) {
    $rootScope.$emit('Addon/OngoingProcess', name);
    root.onGoingProcess = name;
  };

  var disableBalanceListener = $rootScope.$on('Local/BalanceUpdated', function (event, balance) {
    root.assets = null;
    root.error = null;
    $rootScope.$emit('ColoredCoins/Error', null);
    var addresses = lodash.pluck(balance.byAddress, 'address');

    _setOngoingProcess('Getting assets');
    _fetchAssets(addresses, function (err, assets) {
      if (err) {
        var msg = err.error || err.message;
        root.error = msg;
        $rootScope.$emit('ColoredCoins/Error', msg);
        $log.error(msg);
      } else {
        root.assets = assets;
        $rootScope.$emit('ColoredCoins/AssetsUpdated', assets);
      }
      _setOngoingProcess();
    });
  });

  $rootScope.$on('$destroy', function() {
    disableBalanceListener();
    disableFocusListener();
  });

  var handleResponse = function (data, status, cb) {
    $log.debug('Status: ', status);
    $log.debug('Body: ', JSON.stringify(data));

    if (status != 200 && status != 201) {
      return cb(data || { error: "Cannot connect to ColoredCoins API" });
    }
    return cb(null, data);
  };

  var getFrom = function (api_endpoint, param, network, cb) {
    $log.debug('Get from:' + api_endpoint + '/' + param);
    $http.get('/api/' + network + '/v3/' + api_endpoint + '/' + param)
        .success(function (data, status) {
          return handleResponse(data, status, cb);
        })
        .error(function(data, status) {
          return handleResponse(data, status, cb);
        });
  };

  var postTo = function(api_endpoint, json_data, network, cb) {
    $log.debug('Post to:' + api_endpoint + ". Data: " + JSON.stringify(json_data));
    $http.post('/api/' + network + '/v3/' + api_endpoint, json_data)
        .success(function (data, status) {
          return handleResponse(data, status, cb);
        })
        .error(function(data, status) {
          return handleResponse(data, status, cb);
        });
  };

  var extractAssets = function(body) {
    var assets = [];
    if (!body.utxos || body.utxos.length == 0) return assets;

    body.utxos.forEach(function(utxo) {
      if (utxo.assets || utxo.assets.length > 0) {
        utxo.assets.forEach(function(asset) {
          assets.push({ assetId: asset.assetId, amount: asset.amount, utxo: lodash.pick(utxo, [ 'txid', 'index', 'value', 'scriptPubKey']) });
        });
      }
    });

    return assets;
  };

  var getMetadata = function(asset, network, cb) {
    getFrom('assetmetadata', root.assetUtxoId(asset), network, function(err, metadata){
      if (err) { return cb(err); }
      return cb(null, metadata);
    });
  };

  var getAssetsByAddress = function(address, network, cb) {
    getFrom('addressinfo', address, network, function(err, body) {
      if (err) { return cb(err); }
      return cb(null, extractAssets(body));
    });
  };

  var _updateLockedUtxos = function(cb) {
    var fc = profileService.focusedClient;
    fc.getUtxos({}, function(err, utxos) {
      if (err) { return cb(err); }
      _setLockedUtxos(utxos);
      cb();
    });
  };

  var _setLockedUtxos = function(utxos) {
    self.lockedUtxos = lodash.chain(utxos)
        .filter('locked')
        .map(function(utxo) { return utxo.txid + ":" + utxo.vout; })
        .value();
  };

  var selectFinanceOutput = function(financeAmount, fc, cb) {
    fc.getUtxos({}, function(err, utxos) {
      if (err) { return cb(err); }

      _setLockedUtxos(utxos);

      root.txidToUTXO = lodash.reduce(utxos, function(result, utxo) {
        result[utxo.txid + ":" + utxo.vout] = utxo;
        return result;
      }, {});

      var coloredUtxos = root.getColoredUtxos();

      var colorlessUnlockedUtxos = lodash.reject(utxos, function(utxo) {
        return lodash.includes(coloredUtxos, utxo.txid + ":" + utxo.vout) || utxo.locked;
      });

      for (var i = 0; i < colorlessUnlockedUtxos.length; i++) {
        if (colorlessUnlockedUtxos[i].satoshis >= financeAmount) {
          return cb(null, colorlessUnlockedUtxos[i]);
        }
      }
      return cb({ error: "Insufficient funds to finance transfer" });
    });
  };

  var _extractAssetIcon = function(metadata) {
    var icon = lodash.find(lodash.property('metadataOfIssuence.data.urls')(metadata) || [], function(url) { return url.name == 'icon'; });
    return icon ? icon.url : null;
  };

  root.init = function() {};

  root.assetUtxoId = function(asset) {
    return asset.assetId + "/" + asset.utxo.txid + ":" + asset.utxo.index;
  };

  root.getColoredUtxos = function() {
    return lodash.map(root.assets, function(asset) { return asset.utxo.txid + ":" + asset.utxo.index; });
  };

  var _fetchAssets = function(addresses, cb) {
    var assets = [];
    if (addresses.length == 0) {
      return cb(null, assets);
    }
    _updateLockedUtxos(function(err) {
      if (err) { return cb(err); }

      var checkedAddresses = 0;
      lodash.each(addresses, function (address) {
        _getAssetsForAddress(address, function (err, addressAssets) {
          if (err) { return cb(err); }

          assets = assets.concat(addressAssets);

          if (++checkedAddresses == addresses.length) {
            return cb(null, assets);
          }
        })
      });
    });
  };

  var _getAssetsForAddress = function(address, cb) {
    var network = profileService.focusedClient.credentials.network;
    getAssetsByAddress(address, network, function(err, assetsInfo) {
      if (err) { return cb(err); }

      $log.debug("Assets for " + address + ": \n" + JSON.stringify(assetsInfo));

      var assets = [];
      assetsInfo.forEach(function(asset) {
        getMetadata(asset, network, function(err, metadata) {
          if (err) { return cb(err); }
          var isLocked = lodash.includes(self.lockedUtxos, asset.utxo.txid + ":" + asset.utxo.index);
          var a = {
            assetId: asset.assetId,
            utxo: asset.utxo,
            address: address,
            asset: asset,
            network: network,
            divisible: metadata.divisibility,
            reissuable: metadata.lockStatus == false,
            icon: _extractAssetIcon(metadata),
            issuanceTxid: metadata.issuanceTxid,
            metadata: metadata.metadataOfIssuence.data,
            locked: isLocked
          };
          assets.push(a);
          console.log(a);
          if (assetsInfo.length == assets.length) {
            return cb(null, assets);
          }
        });
      });
      if (assetsInfo.length == assets.length) {
        return cb(null, assets);
      }
    });
  };

  root.broadcastTx = function(txHex, cb) {
    var network = profileService.focusedClient.credentials.network;
    postTo('broadcast', { txHex: txHex }, network, cb);
  };

  root.createTransferTx = function(asset, amount, toAddress, cb) {
    if (amount > asset.asset.amount) {
      return cb({ error: "Cannot transfer more assets then available" }, null);
    }

    var fc = profileService.focusedClient;

    var to = [{
      "address": toAddress,
      "amount": amount,
      "assetId": asset.asset.assetId
    }];

    // transfer the rest of asset back to our address
    if (amount < asset.asset.amount) {
      to.push({
        "address": asset.address,
        "amount": asset.asset.amount - amount,
        "assetId": asset.asset.assetId
      });
    }

    ccFeeService.estimateCostOfTransfer(amount, asset.asset.amount, function(err, fee, financeAmount) {

      selectFinanceOutput(financeAmount, fc, function(err, financeUtxo) {
        if (err) { return cb(err); }

        var transfer = {
          sendutxo: [asset.utxo.txid + ':' + asset.utxo.index],
          fee: fee,
          to: to,
          financeOutput: {
            value: financeUtxo.satoshis,
            n: financeUtxo.vout,
            scriptPubKey: {
              asm: new bitcore.Script(financeUtxo.scriptPubKey).toString(),
              hex: financeUtxo.scriptPubKey,
              type: 'scripthash'
            }
          },
          financeOutputTxid: financeUtxo.txid
        };

        console.log(JSON.stringify(transfer, null, 2));
        var network = fc.credentials.network;
        postTo('sendasset', transfer, network, cb);
      });
    });
  };

  root.createIssueTx = function(issuance, cb) {

    ccFeeService.estimateCostOfIssuance(function(err, fee, financeAmount) {
      var fc = profileService.focusedClient;

      selectFinanceOutput(financeAmount, fc, function(err, financeUtxo) {
        if (err) { return cb(err); }

        var metadata = lodash.pick(issuance, ['assetName', 'description', 'issuer', 'urls', 'userData']);
        metadata.userData = {
          meta: metadata.userData
        };

        var issuanceOpts = {
          issueAddress: financeUtxo.address,
          fee: fee,
          divisibility: 0,
          amount: issuance.amount,
          reissueable: issuance.reissuable || false,
          transfer: [{
            'address': financeUtxo.address,
            'amount': issuance.amount
          }],
          metadata: metadata
        };

        console.log(JSON.stringify(issuanceOpts, null, 2));
        var network = fc.credentials.network;
        postTo('issue', issuanceOpts, network, function (err, data) {
          if (data) {
            data.issuanceUtxo = financeUtxo;
          }
          return cb(err, data);
        });
      });
    });
  };


  return root;
}


angular.module('copayAddon.coloredCoins').service('coloredCoins', ColoredCoins);
