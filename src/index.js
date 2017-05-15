import D from 'debug'
import grpc from 'grpc'
import EventEmitter from 'eventemitter3'

import EventProcessingQueue from './EventProcessingQueue'
import Timemachine from './Timemachine'

function Timetraveler (customSettings) {
  const settings = {...Timetraveler.defaultSettings, ...customSettings}
  validateSettings(settings)
  const debug = D('timetraveler')

  const traveler = new EventEmitter()

  const {
    fromEventId,
    batchSize,
    hwm,
    lwm,
    eventStoreAddress,
    eventStoreCredentials,
    eventHandler
  } = settings

  const state = {
    lwm,
    hwm,
    travelling: false,
    subscribed: true,
    lastFetchedEvent: null,
    lastProcessedEvent: null
  }

  let _queue = EventProcessingQueue({lwm, hwm, eventHandler})

  const onStateUpdated = () => traveler.emit('stats', {
    ...state,
    queueSize: _queue.size
  })

  _queue.on('processed:event', (event) => {
    state.lastProcessedEvent = event
    onStateUpdated()
  })
  _queue.on('processing:error', (event, error) => {
    traveler.emit('eventProcessingError', event, error)
  })
  _queue.on('hwm', () => {
    console.log()
    console.log(`QUEUE HIGH WATER MARK REACHED`)
    console.log()
  })
  _queue.on('lwm', () => {
    console.log()
    console.log(`QUEUE LOW WATER MARK REACHED`)
    console.log()
  })
  _queue.on('drain', () => {
    console.log()
    console.log(`DRAIN`)
    console.log()
  })

  let _timemachine = Timemachine({
    eventStoreAddress,
    eventStoreCredentials,
    batchSize
  })
  _timemachine.on('event', (event) => {
    state.lastFetchedEvent = event
    _queue.add(event)
    onStateUpdated()
  })
  _timemachine.on('subscribed', () => {
    state.subscribed = true
    onStateUpdated()
  })
  _timemachine.on('unsubscribed', () => {
    state.subscribed = false
    onStateUpdated()
  })

  function start () {
    if (state.travelling) return traveler
    state.traveling = true
    let lastFetchedEventId = state.lastFetchedEvent
      ? state.lastFetchedEvent.id
      : fromEventId
    debug(`starting to timetravel from event id ${lastFetchedEventId}`)
    _timemachine.start(lastFetchedEventId)
    onStateUpdated()
    return traveler
  }
  function stop () {
    if (!state.traveling) return traveler
    state.traveling = false
    debug(`stopping timetravel`)
    _queue.stop()
    _timemachine.stop()
    onStateUpdated()
    return traveler
  }

  return Object.defineProperties(traveler, {
    start: {value: start},
    stop: {value: stop}
  })
}

Timetraveler.defaultSettings = {
  fromEventId: '0',
  batchSize: 1000,
  hwm: 10000,
  lwm: 1000,
  eventStoreCredentials: grpc.credentials.createInsecure(),
  eventHandler: () => Promise.resolve()
}

function validateSettings (settings) {
  let { eventStoreAddress } = settings
  if (!eventStoreAddress || typeof eventStoreAddress !== 'string') throw new Error(`eventStoreAddress should be a notempty string`)
}

export default Timetraveler
