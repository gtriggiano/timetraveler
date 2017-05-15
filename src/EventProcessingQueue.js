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
    if (!event) return

    const jsEvent = event.toJS()

    Promise.resolve(eventHandler(jsEvent))
      .then(() => {
        _events = _events.shift()

        _lastProcessedEvent = event
        queue.emit('processed:event', jsEvent)

        const queueFinalSize = _events.size
        if (!queueFinalSize) queue.emit('drain')

        _onProcessNext()
      })
      .catch((error) => {
        queue.emit('processing:error', jsEvent, error)
        setTimeout(() => {
          _onProcessNext()
        }, 1000)
      })
  }

  function add (event) {
    let wasOverLWM = _events.size >= lwm
    let wasBelowHWM = _events.size < hwm

    _events.push(fromJS(event))

    let isBelowLWM = queue.size < lwm
    let isOverHWM = _events.size >= hwm

    if (isBelowLWM && wasOverLWM) queue.emit('lwm')
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
