import { getProtocol } from 'grpc-event-store'
import EventEmitter from 'eventemitter3'

function Timemachine ({
  eventStoreAddress,
  eventStoreCredentials,
  batchSize
}) {
  let timemachine = new EventEmitter()

  let _started = false
  let _fetching = false
  let _subscription = null

  let _lastFetchedEventId = 0

  const protocol = getProtocol()
  let _esClient = new protocol.EventStore(
    eventStoreAddress,
    eventStoreCredentials
  )

  function _onEvent (event) {
    if (!_started) return
    _lastFetchedEventId = event.id
    timemachine.emit('event', event)
  }

  function _fetchEvents () {
    if (!_started || _fetching) return
    _fetching = true

    let foundEvents = 0
    let call = _esClient.readStoreForward({
      fromEventId: _lastFetchedEventId,
      limit: batchSize
    })
    call.on('data', (event) => {
      foundEvents++
      _onEvent(event)
    })
    call.on('end', () => {
      _fetching = false
      if (foundEvents < batchSize) {
        timemachine.emit('subscribed')
        _subscribe()
      } else {
        _fetchEvents()
      }
    })
  }
  function _subscribe () {
    _subscription = _esClient.catchUpWithStore()
    _subscription.on('data', (event) => {
      _onEvent(event)
    })
    _subscription.on('error', () => _onSubscriptionInterruption())
    _subscription.on('end', () => _onSubscriptionInterruption())
    _subscription.write({
      fromEventId: _lastFetchedEventId
    })
  }
  function _onSubscriptionInterruption () {
    if (_subscription) {
      _subscription.end()
      _subscription = null
      timemachine.emit('unsubscribed')
      setTimeout(() => _fetchEvents(), 1000)
    }
  }

  function start (fromEventId) {
    if (_started) return timemachine
    _started = true
    _lastFetchedEventId = fromEventId
    _fetchEvents()
    return timemachine
  }
  function stop () {
    if (!_started) return timemachine
    _started = false
    if (_subscription) _onSubscriptionInterruption()
    return timemachine
  }

  return Object.defineProperties(timemachine, {
    start: {value: start},
    stop: {value: stop}
  })
}

export default Timemachine
