const express = require('express');
const path = require('path');
const docRoot = __dirname;
const app = express();
const port = 3000;
const fs = require('fs');
const Throttle = require('stream-throttle').Throttle;

// bytes per second
const DEFAULT_THROTTLERATE = 128;

const DefaultDownloadFilename = "file.zip";
const PayloadSize = fs.statSync( path.join(docRoot, "file.zip") ).size;

function throttledResponse(request, response, options = {}) {
  let fileName = options.fileName || DefaultDownloadFilename;
  let pathname = path.join(docRoot, options.fileName || "file.zip");
  headers = {
    "Content-Type": options.type || "application/octet-stream",
    "Content-Disposition": "attachment; filename=" + fileName,
  };
  let throttleRate = DEFAULT_THROTTLERATE;
  let [_, len, unit] = options.time.match(/^([\d\.]+)+(m|s)/i);
  len = len && parseFloat(len);
  if (!isNaN(len) && unit) {
    switch (unit.toLowerCase()) {
      case "m":
        throttleRate = Math.ceil(PayloadSize / 60 * len);
        break;
      case "s":
        throttleRate = Math.ceil(PayloadSize / len);
        break;
    }
  }

  if (!options.indeterminate) {
    let stat = fs.statSync(pathname);
    headers["Content-Length"] = stat.size;
  }
  response.writeHead(200, headers);
  fs.createReadStream(pathname).pipe(new Throttle({ rate: throttleRate })).pipe(response);
}

app.get('/download.zip', async function(request, response, next) {
  throttledResponse(request, response, { time: request.query.time });
});

app.get('/indeterminate.zip', async function(request, response, next) {
  throttledResponse(request, response, {
    indeterminate: true,
    time: request.query.time,
  });
});

app.get('*', async function(request, response, next) {
  let pathname = path.join(docRoot, "index.html");

  response.writeHead(200, {"Content-Type": "text/html"});
  fs.createReadStream(pathname).pipe(response);
});

app.listen(port, () => {
  console.log(`Slow download app listening at http://localhost:${port}`)
});
