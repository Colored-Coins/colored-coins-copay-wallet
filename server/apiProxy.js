var httpProxy = require('http-proxy'),
    cors = require('./cors'),
    version = require('../package.json').version;

var testnetProxy = httpProxy.createProxyServer({});

var mainnetProxy = httpProxy.createProxyServer({});


var config = function (proxy){
  proxy.on('proxyReq', function(proxyReq, req) {
    // keep a ref
     req._proxyReq = proxyReq;
  });

  proxy.on('error', function(err, req, res) {
  if (req.socket.destroyed && err.code === 'ECONNRESET') {
    req._proxyReq.abort();
  }
  });
}

config(testnetProxy);
config(mainnetProxy);

var userAgent = function (proxyReq, req, res, options) {
  proxyReq.setHeader('User-Agent', req.headers['user-agent'] + ' ColoredCopay/' + version);
};

testnetProxy.on('proxyReq', userAgent);
mainnetProxy.on('proxyReq', userAgent);

var attach = function(app) {
  app.use('/api/testnet', cors, function(req, res) {
    testnetProxy.web(req, res, { target:'http://ccd.gat.hoopox.com' });
  });

  app.use('/api/livenet', cors, function(req, res) {
    testnetProxy.web(req, res, { target:'http://ccd.gat.hoopox.com' });
  });
};

module.exports = attach;
