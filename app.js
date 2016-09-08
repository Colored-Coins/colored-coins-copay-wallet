require('dotenv').config();

var express = require('express'),
    path = require('path'),
    enableApiProxy = require('./server/apiProxy'),
    enableIconUpload = require('./server/uploadServer'),
    app = express();

app.use(express.static(__dirname + '/public'));

if (!process.env.S3_BUCKET) {
  console.error("Error: Missing S3_BUCKET env variable");
  return;
}
if (!process.env.S3_REGION) {
  console.error("Error: Missing S3_REGION env variable");
  return;
}
enableIconUpload(app, process.env.S3_REGION, process.env.S3_BUCKET);

enableApiProxy(app);

var port = process.env.PORT || 3000;
app.listen(port);
console.log("App listening on port " + port);

app.get('*', function(req, res) {
  res.sendFile(path.join(__dirname, 'public'));
});
