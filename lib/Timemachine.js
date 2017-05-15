'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _grpcEventStore = require('grpc-event-store');

var _eventemitter = require('eventemitter3');

var _eventemitter2 = _interopRequireDefault(_eventemitter);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function Timemachine({
  eventStoreAddress,
  eventStoreCredentials,
  batchSize
}) {
  let timemachine = new _eventemitter2.default();

  let _started = false;
  let _fetching = false;
  let _subscription = null;

  let _lastFetchedEventId = 0;

  let _esClient = _grpcEventStore.EventStoreProtocol.EventStore(eventStoreAddress, eventStoreCredentials);

  function _onEvent(event) {
    if (!_started) return;
    _lastFetchedEventId = event.id;
    timemachine.emit('event', event);
  }

  function _fetchEvents() {
    if (!_started || _fetching) return;
    _fetching = true;

    let foundEvents = 0;
    let call = _esClient.readStoreStreamForward({
      fromEventId: _lastFetchedEventId,
      limit: batchSize
    });
    call.on('data', event => {
      foundEvents++;
      _onEvent(event);
    });
    call.on('end', () => {
      _fetching = false;
      if (foundEvents < batchSize) {
        timemachine.emit('subscribing');
        _subscribe();
      } else {
        _fetchEvents();
      }
    });
  }
  function _subscribe() {
    _subscription = _esClient.catchUpStoreStream({
      fromEventId: _lastFetchedEventId
    });
    _subscription.on('data', event => {
      _onEvent(event);
    });
    _subscription.on('error', () => _onSubscriptionInterruption());
    _subscription.on('end', () => _onSubscriptionInterruption());
    _subscription.write({});
  }
  function _onSubscriptionInterruption() {
    _subscription.end();
    _subscription = null;
    timemachine.emit('subscription:interrupt');
    setTimeout(() => _fetchEvents(), 1000);
  }

  function start(fromEventId) {
    if (_started) return timemachine;
    _started = true;
    _lastFetchedEventId = fromEventId;
    _fetchEvents();
    return timemachine;
  }
  function stop() {
    if (!_started) return timemachine;
    _started = false;
    if (_subscription) _onSubscriptionInterruption();
    return timemachine;
  }

  return Object.defineProperties(timemachine, {
    start: { value: start },
    stop: { value: stop }
  });
}

exports.default = Timemachine;