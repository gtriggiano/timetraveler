'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = Dashboard;

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _http = require('http');

var _http2 = _interopRequireDefault(_http);

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _socket = require('./socket');

var _socket2 = _interopRequireDefault(_socket);

var _stateTimeseriesEndpoint = require('./stateTimeseriesEndpoint');

var _stateTimeseriesEndpoint2 = _interopRequireDefault(_stateTimeseriesEndpoint);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function Dashboard(timetraveler) {
  const app = (0, _express2.default)();
  const httpServer = _http2.default.Server(app);
  const io = (0, _socket2.default)(httpServer, timetraveler);

  app.get('/states-in-timerange/:timeRange', (req, res, next) => {
    req.timeRange = req.params.timeRange;
    next();
  }, (0, _stateTimeseriesEndpoint2.default)(timetraveler));
  app.use(_express2.default.static(_path2.default.resolve(__dirname, 'static')));

  return {
    app,
    httpServer,
    io
  };
}