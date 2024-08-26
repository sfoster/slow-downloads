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

function secondsFromString(timeStr) {
 let [_, len, unit] = timeStr.match(/^([\d\.]+)+(m|s)/i);
  len = len && parseFloat(len);
  if (!isNaN(len) && unit) {
    switch (unit.toLowerCase()) {
      case "m":
        return 60 * len;
      case "s":
        return len;
    }
  }
  // handle as milliseconds by default
  return len/1000;
}

function throttledResponse(request, response, options = {}) {
  let fileName = options.fileName || DefaultDownloadFilename;
  let pathname = path.join(docRoot, options.fileName || "file.zip");
  headers = {
    "Content-Type": options.type || "application/octet-stream",
    "Content-Disposition": "attachment; filename=" + fileName,
  };
  let throttleRate = DEFAULT_THROTTLERATE;
  let seconds = secondsFromString(options.time);
  if (isNaN(seconds)) {
    console.warn("Couldnt turn time query into seconds: ", options.time);
  } else {
    throttleRate = Math.ceil(PayloadSize / seconds);
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

// a direct, non-throttled response for comparison
app.get('/file.zip', async function(request, response, next) {
  let fileName = DefaultDownloadFilename;
  let pathname = path.join(docRoot, "file.zip");
  headers = {
    "Content-Type": "application/octet-stream",
    "Content-Disposition": "attachment; filename=" + fileName,
  };
  let stat = fs.statSync(pathname);
  headers["Content-Length"] = stat.size;

  response.writeHead(200, headers);
  fs.createReadStream(pathname).pipe(response);
});

app.get('/slow.html', async function(request, response, next) {
  let fileName = "slow.html";
  let pathname = path.join(docRoot, fileName);
  headers = {
    "Content-Type": "text/html",
  };
  let stat = fs.statSync(pathname);
  let payloadSize = stat.size;
  let throttleRate = DEFAULT_THROTTLERATE;
  if (request.query.time) {
    let [_, len, unit] = request.query.time.match(/^([\d\.]+)+(m|s)/i);
    len = len && parseFloat(len);
    if (!isNaN(len) && unit) {
      switch (unit.toLowerCase()) {
        case "m":
          throttleRate = Math.ceil(payloadSize / (60 * len));
          break;
        case "s":
          throttleRate = Math.ceil(payloadSize / len);
          break;
      }
    }
  }
  let delay = 1000 * (request.query.delay ? secondsFromString(request.query.delay) : 0);
  console.log("delay for seconds:", delay);
  response.writeHead(200, headers);
  let start = Date.now();
  setTimeout(() => {
    fs.createReadStream(pathname).pipe(new Throttle({ rate: throttleRate }))
      .pipe(response)
      .on("close", () => {
        console.log(`Finished, ${Date.now() - start} elapsed`);
      });
  }, delay);
});

app.get('*', async function(request, response, next) {
  let pathname = path.join(docRoot, "index.html");

  response.writeHead(200, {"Content-Type": "text/html"});
  fs.createReadStream(pathname).pipe(response);
});

app.listen(port, () => {
  console.log(`Slow download app listening at http://localhost:${port}`)
});
