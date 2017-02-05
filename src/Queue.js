import EventEmitter from 'eventemitter3'

function Queue ({hwm, processor}) {
  let queue = new EventEmitter()

  let _started = false
  let _lastProcessedEventId = null
  let _events = []

  let _next = () => {
    if (!_started) return
    const hadEvents = !!queue.size
    let event = _events[0]
    if (!event) return
    processor(event)
      .then(() => {
        _events.shift()
        _lastProcessedEventId = event.id
        queue.emit('processed:event', event)
        const hasEvents = !!queue.size
        if (!hasEvents && hadEvents) queue.emit('drain')
        _next()
      })
      .catch((error) => {
        queue.emit('processing:error', event, error)
        setTimeout(() => {
          _next()
        }, 1000)
      })
  }

  function add (event) {
    let wasBelowHWM = queue.size <= hwm
    _events.push(event)
    let isBelowHWM = queue.size <= hwm
    if (!isBelowHWM && wasBelowHWM) queue.emit('hwm:alert')
    if (isBelowHWM && !wasBelowHWM) queue.emit('hwm:calm')
    queue.start()
    return queue
  }
  function start () {
    if (_started) return
    _next()
    return queue
  }
  function stop () {
    _started = false
    return queue
  }

  return Object.defineProperties(queue, {
    lastProcessedEvent: {
      enumerable: true,
      get: () => _lastProcessedEventId
    },
    size: {
      enumerable: true,
      get: () => _events.length
    },
    add: {value: add},
    start: {value: start},
    stop: {value: stop}
  })
}

export default Queue
