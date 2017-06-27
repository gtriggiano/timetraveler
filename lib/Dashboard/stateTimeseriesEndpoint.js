'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = stateTimeseriesEndpoint;

var _utils = require('../utils');

function stateTimeseriesEndpoint(timetraveler) {
  return (req, res) => {
    let datesRange;

    try {
      datesRange = (0, _utils.toDatesRange)(req.timeRange);
    } catch (e) {
      res.status(400).send({
        error: e.message
      });
      return;
    }
    var _datesRange = datesRange;
    const from = _datesRange.from,
          to = _datesRange.to;

    let states = timetraveler.getStatesInDateRange(from, to);
    res.send(states);
  };
}