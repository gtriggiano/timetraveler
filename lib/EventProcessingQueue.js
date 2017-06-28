'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = EventProcessingQueue;

var _immutable = require('immutable');

var _eventemitter = require('eventemitter3');

var _eventemitter2 = _interopRequireDefault(_eventemitter);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function EventProcessingQueue({
  lwm,
  hwm,
  eventHandler
}) {
  let queue = new _eventemitter2.default();

  let _isRunning = false;
  let _lastProcessedEvent = null;
  let _events = (0, _immutable.List)();

  const _onProcessNext = () => {
    if (!_isRunning) return;

    let event = _events.first();
    if (!event) {
      _isRunning = false;
      return;
    }

    const jsEvent = event.toJS();

    Promise.resolve(eventHandler(jsEvent)).then(() => {
      let wasOverLWM = _events.size >= lwm;
      _events = _events.shift();
      let isBelowLWM = _events.size < lwm;

      _lastProcessedEvent = event;
      queue.emit('processed:event', event.toJS());

      if (isBelowLWM && wasOverLWM) queue.emit('lwm');
      if (!_events.size) queue.emit('drain');

      _onProcessNext();
    }).catch(error => {
      queue.emit('processing:error', event.toJS(), error);
      setTimeout(() => {
        _onProcessNext();
      }, 1000);
    });
  };

  function add(event) {
    let wasBelowHWM = _events.size < hwm;
    _events = _events.push((0, _immutable.fromJS)(event));
    let isOverHWM = _events.size >= hwm;
    if (isOverHWM && wasBelowHWM) queue.emit('hwm');
    return start();
  }
  function start() {
    if (_isRunning) return queue;
    _isRunning = true;
    _onProcessNext();
    return queue;
  }
  function stop() {
    _isRunning = false;
    return queue;
  }

  return Object.defineProperties(queue, {
    lastProcessedEvent: {
      enumerable: true,
      get: () => _lastProcessedEvent && _lastProcessedEvent.toJS()
    },
    size: {
      enumerable: true,
      get: () => _events.size
    },
    lwm: { value: lwm },
    hwm: { value: hwm },
    add: { value: add },
    start: { value: start },
    stop: { value: stop }
  });
}