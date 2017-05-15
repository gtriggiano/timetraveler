'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _grpc = require('grpc');

var _grpc2 = _interopRequireDefault(_grpc);

var _eventemitter = require('eventemitter3');

var _eventemitter2 = _interopRequireDefault(_eventemitter);

var _EventProcessingQueue = require('./EventProcessingQueue');

var _EventProcessingQueue2 = _interopRequireDefault(_EventProcessingQueue);

var _Timemachine = require('./Timemachine');

var _Timemachine2 = _interopRequireDefault(_Timemachine);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function Timetraveler(customSettings) {
  const settings = _extends({}, Timetraveler.defaultSettings, customSettings);
  validateSettings(settings);
  const debug = (0, _debug2.default)('timetraveler');

  const traveler = new _eventemitter2.default();

  const fromEventId = settings.fromEventId,
        batchSize = settings.batchSize,
        hwm = settings.hwm,
        lwm = settings.lwm,
        eventStoreAddress = settings.eventStoreAddress,
        eventStoreCredentials = settings.eventStoreCredentials,
        eventHandler = settings.eventHandler;


  const state = {
    lwm,
    hwm,
    travelling: false,
    subscribed: true,
    lastFetchedEvent: null,
    lastProcessedEvent: null
  };

  let _queue = (0, _EventProcessingQueue2.default)({ lwm, hwm, eventHandler });

  const onStateUpdated = () => traveler.emit('stats', _extends({}, state, {
    queueSize: _queue.size
  }));

  _queue.on('processed:event', event => {
    state.lastProcessedEvent = event;
    onStateUpdated();
  });
  _queue.on('processing:error', (event, error) => {
    traveler.emit('eventProcessingError', event, error);
  });
  _queue.on('hwm', () => {
    console.log();
    console.log(`QUEUE HIGH WATER MARK REACHED`);
    console.log();
  });
  _queue.on('lwm', () => {
    console.log();
    console.log(`QUEUE LOW WATER MARK REACHED`);
    console.log();
  });
  _queue.on('drain', () => {
    console.log();
    console.log(`DRAIN`);
    console.log();
  });

  let _timemachine = (0, _Timemachine2.default)({
    eventStoreAddress,
    eventStoreCredentials,
    batchSize
  });
  _timemachine.on('event', event => {
    state.lastFetchedEvent = event;
    _queue.add(event);
    onStateUpdated();
  });
  _timemachine.on('subscribed', () => {
    state.subscribed = true;
    onStateUpdated();
  });
  _timemachine.on('unsubscribed', () => {
    state.subscribed = false;
    onStateUpdated();
  });

  function start() {
    if (state.travelling) return traveler;
    state.traveling = true;
    let lastFetchedEventId = state.lastFetchedEvent ? state.lastFetchedEvent.id : fromEventId;
    debug(`starting to timetravel from event id ${lastFetchedEventId}`);
    _timemachine.start(lastFetchedEventId);
    onStateUpdated();
    return traveler;
  }
  function stop() {
    if (!state.traveling) return traveler;
    state.traveling = false;
    debug(`stopping timetravel`);
    _queue.stop();
    _timemachine.stop();
    onStateUpdated();
    return traveler;
  }

  return Object.defineProperties(traveler, {
    start: { value: start },
    stop: { value: stop }
  });
}

Timetraveler.defaultSettings = {
  fromEventId: '0',
  batchSize: 1000,
  hwm: 10000,
  lwm: 1000,
  eventStoreCredentials: _grpc2.default.credentials.createInsecure(),
  eventHandler: () => Promise.resolve()
};

function validateSettings(settings) {
  let eventStoreAddress = settings.eventStoreAddress;

  if (!eventStoreAddress || typeof eventStoreAddress !== 'string') throw new Error(`eventStoreAddress should be a notempty string`);
}

exports.default = Timetraveler;