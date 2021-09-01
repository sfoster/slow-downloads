slow-downloads
==============

A utility (HTTP server) to deliver a payload over a given amount of time. 

Install
-------

`npm install`

Usage
-----

To start the server:

`node file-server.js`

Then open http://localhost:3000/ for a list of example requests. 

`download.zip` requests are delivered as fixed/known Content-Length files, `indeterminate.zip` as unknown/indeterminate file responses. 
A `time` querystring param can be used to specify how long you want the download to take, within reason, in either minutes or seconds. E.g. `time=10s` or `time=5m` for 10 seconds and 5 minutes respectively. 

