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
    if (!event) return;

    const jsEvent = event.toJS();

    Promise.resolve(eventHandler(jsEvent)).then(() => {
      _events = _events.shift();

      _lastProcessedEvent = event;
      queue.emit('processed:event', jsEvent);

      const queueFinalSize = _events.size;
      if (!queueFinalSize) queue.emit('drain');

      _onProcessNext();
    }).catch(error => {
      queue.emit('processing:error', jsEvent, error);
      setTimeout(() => {
        _onProcessNext();
      }, 1000);
    });
  };

  function add(event) {
    let wasOverLWM = _events.size >= lwm;
    let wasBelowHWM = _events.size < hwm;

    _events.push((0, _immutable.fromJS)(event));

    let isBelowLWM = queue.size < lwm;
    let isOverHWM = _events.size >= hwm;

    if (isBelowLWM && wasOverLWM) queue.emit('lwm');
    if (isOverHWM && wasBelowHWM) queue.emit('hwm');

    return start();
  }
  function start() {
    if (_isRunning) return queue;
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