import { fromJS, List } from 'immutable'
import EventEmitter from 'eventemitter3'

export default function EventProcessingQueue ({
  lwm,
  hwm,
  eventHandler
}) {
  let queue = new EventEmitter()

  let _isRunning = false
  let _lastProcessedEvent = null
  let _events = List()

  const _onProcessNext = () => {
    if (!_isRunning) return

    let event = _events.first()
    if (!event) {
      _isRunning = false
      return
    }

    const jsEvent = event.toJS()

    Promise.resolve(eventHandler(jsEvent))
      .then(() => {
        let wasOverLWM = _events.size >= lwm
        _events = _events.shift()
        let isBelowLWM = _events.size < lwm

        _lastProcessedEvent = event
        queue.emit('processed:event', event.toJS())

        if (isBelowLWM && wasOverLWM) queue.emit('lwm')
        if (!_events.size) queue.emit('drain')

        _onProcessNext()
      })
      .catch((error) => {
        queue.emit('processing:error', event.toJS(), error)
        setTimeout(() => {
          _onProcessNext()
        }, 1000)
      })
  }

  function add (event) {
    let wasBelowHWM = _events.size < hwm
    _events = _events.push(fromJS(event))
    let isOverHWM = _events.size >= hwm
    if (isOverHWM && wasBelowHWM) queue.emit('hwm')
    return start()
  }
  function start () {
    if (_isRunning) return queue
    _isRunning = true
    _onProcessNext()
    return queue
  }
  function stop () {
    _isRunning = false
    return queue
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
    lwm: {value: lwm},
    hwm: {value: hwm},
    add: {value: add},
    start: {value: start},
    stop: {value: stop}
  })
}
