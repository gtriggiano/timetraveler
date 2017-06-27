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

var _lodash = require('lodash');

var _EventProcessingQueue = require('./EventProcessingQueue');

var _EventProcessingQueue2 = _interopRequireDefault(_EventProcessingQueue);

var _Timemachine = require('./Timemachine');

var _Timemachine2 = _interopRequireDefault(_Timemachine);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const essentialEvent = event => (0, _lodash.pick)(event, ['id', 'storedOn']);

/**
 * Provides a traveler instance
 * @param {[Object]} customSettings [description]
 * @param {[String]} customSettings.fromEventId
 * @param {[Integer]} customSettings.batchSize
 * @param {[Integer]} customSettings.hwm
 * @param {[Integer]} customSettings.lwm
 * @param {[GRPC Credentials]} customSettings.eventStoreCredentials
 * @param {[Function]} customSettings.eventHandler
 */
function Timetraveler(customSettings) {
  const settings = _extends({}, Timetraveler.defaultSettings, customSettings);
  validateSettings(settings);
  const debug = (0, _debug2.default)('timetraveler');

  /**
   * The traveler intance
   */
  const traveler = new _eventemitter2.default();

  const fromEventId = settings.fromEventId,
        batchSize = settings.batchSize,
        hwm = settings.hwm,
        lwm = settings.lwm,
        eventStoreAddress = settings.eventStoreAddress,
        eventStoreCredentials = settings.eventStoreCredentials,
        eventHandler = settings.eventHandler;


  let state = {
    lwm,
    hwm,
    travelling: false,
    subscribed: false,
    lastFetchedEvent: null,
    lastProcessedEvent: null

    /**
     * The internal queue of events to process
     */
  };const _queue = (0, _EventProcessingQueue2.default)({ lwm, hwm, eventHandler });

  /**
   * The internals timed snapshots of the states of the traveler
   * @type {Array}
   */
  const statesTimeserie = [];

  /**
   * When invoked the traveler emits it state
   * and stores a timed snapshot of it
   * @return {[type]} [description]
   */
  const broadcastState = (0, _lodash.throttle)(() => {
    let actualState = _extends({}, state, { queueSize: _queue.size });
    statesTimeserie.push({
      t: new Date(),
      qs: actualState.queueSize,
      tr: actualState.travelling,
      ss: actualState.subscribed
    });
    traveler.emit('state', actualState);
  }, 400, { leading: true, trailing: true });

  _queue.on('processed:event', event => {
    state.lastProcessedEvent = essentialEvent(event);
    broadcastState();
  });
  _queue.on('processing:error', (event, error) => {
    // Propagate the processing error for UI or other consumers
    traveler.emit('eventProcessingError', event, error);
  });
  _queue.on('hwm', () => {
    console.log();
    console.log(`${new Date()} Timetraveler QUEUE HIGH WATER MARK REACHED`);
    console.log();
    if (state.travelling) _timemachine.stop();
  });
  _queue.on('lwm', () => {
    console.log();
    console.log(`${new Date()} Timetraveler QUEUE LOW WATER MARK REACHED`);
    console.log();
    let lastFetchedEventId = state.lastFetchedEvent ? state.lastFetchedEvent.id : fromEventId;
    if (state.travelling) _timemachine.start(lastFetchedEventId);
  });

  /**
   * The internal timemachine extracting the
   * events from the eventstore
   */
  let _timemachine = (0, _Timemachine2.default)({
    eventStoreAddress,
    eventStoreCredentials,
    batchSize
  });
  _timemachine.on('event', event => {
    state.lastFetchedEvent = essentialEvent(event);
    _queue.add(event);
    broadcastState();
  });
  _timemachine.on('subscribed', () => {
    state.subscribed = true;
    broadcastState();
  });
  _timemachine.on('unsubscribed', () => {
    state.subscribed = false;
    broadcastState();
  });

  /**
   * Starts the traveler work
   *
   * Fetching starts from the last fetched event id or
   * from the id passed at instantiation time
   */
  const start = () => {
    if (state.travelling) return traveler;
    state.travelling = true;
    let lastFetchedEventId = state.lastFetchedEvent ? state.lastFetchedEvent.id : fromEventId;
    debug(`starting timetravel from event id ${lastFetchedEventId}`);
    _timemachine.start(lastFetchedEventId);
    broadcastState();
    return traveler;
  };
  /**
   * Stops the traveler work
   *
   * Queue stops to process events
   * Timemachine stops to fetch
   * Already queued events stay queued
   * @return {[type]} [description]
   */
  const stop = () => {
    if (!state.travelling) return traveler;
    state.travelling = false;
    debug(`stopping timetravel`);
    _queue.stop();
    _timemachine.stop();
    broadcastState();
    return traveler;
  };

  // It is lazy loaded
  let dashboardApp = null;

  /**
   * Instance composition
   */
  return Object.defineProperties(traveler, {
    start: { value: start },
    stop: { value: stop },
    state: { get: () => _extends({}, state, { queueSize: _queue.size }) },
    startedOn: { get: () => {
        let firstState = (0, _lodash.first)(statesTimeserie);
        return firstState && firstState.t || null;
      } },
    getStatesInDateRange: {
      value: (from, to) => statesTimeserie.filter(({ t }) => t >= from && t <= to).map(i => _extends({}, i))
    },
    ui: { get: () => {
        if (!dashboardApp) {
          dashboardApp = require('./Dashboard').default(traveler);
        }
        return dashboardApp;
      } }
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