var fs = require('fs');
var http = require('http');
var path = require('path');
var crypto = require('crypto');

http.createServer(function (req, res) {
  var file = path.join(__dirname, req.url);

  fs.stat(file, function (err, stat) {
    if (err) {
      sendError(err, req, res, file, stat);
    } else {
      // if-modified-since
      // if-none-match
      // console.log(file);

      // var IfModifiedSince = req.headers['if-modified-since'];
      var IfNoneMatch = req.headers['if-none-match'];
      // 获取资源最后修改时间 : stat.ctime.toGMTString()
      var etag = crypto.createHash('sha1').update(stat.ctime.toGMTString() + stat.size).digest('hex');
      if (IfNoneMatch) {
        if (IfNoneMatch == etag) {
          // res.writeHead(304);
          // console.log(file);
          res.statusCode = 304;
          res.end();
        } else {
          send(req, res, file, etag);
        }
      } else {
        send(req, res, file, etag);
      }
    }
  });
}).listen(8080, function () {
  console.log('listen to 8080 port');
});

function readFile (filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function send (req, res, file, etag) {
  // res.setHeader('Last-Modified', stat.ctime.toGMTString());
  // res.setHeader('Expires', new Date(Date.now() + 20000).toGMTString());
  // res.setHeader('Cache-Control', 'max-age=4');
  res.setHeader('ETag', etag);
  res.end(readFile(file));
}

function sendError (err, req, res, file, etag) {
  res.writeHead(400, { 'Content-Type': 'text/html' });
  res.end(err ? err.toString() : 'Not Found');
}
