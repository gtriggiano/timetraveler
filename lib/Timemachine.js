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

  const protocol = (0, _grpcEventStore.getProtocol)();
  let _esClient = new protocol.EventStore(eventStoreAddress, eventStoreCredentials);

  function _onEvent(event) {
    if (!_started) return;
    _lastFetchedEventId = event.id;
    timemachine.emit('event', event);
  }

  function _fetchEvents() {
    if (!_started || _fetching) return;
    _fetching = true;

    let foundEvents = 0;
    let call = _esClient.readStoreForward({
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
        timemachine.emit('subscribed');
        _subscribe();
      } else {
        _fetchEvents();
      }
    });
  }
  function _subscribe() {
    _subscription = _esClient.catchUpWithStore();
    _subscription.on('data', event => {
      _onEvent(event);
    });
    _subscription.on('error', () => _onSubscriptionInterruption());
    _subscription.on('end', () => _onSubscriptionInterruption());
    _subscription.write({
      fromEventId: _lastFetchedEventId
    });
  }
  function _onSubscriptionInterruption() {
    if (_subscription) {
      _subscription.end();
      _subscription = null;
      timemachine.emit('unsubscribed');
      setTimeout(() => _fetchEvents(), 1000);
    }
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