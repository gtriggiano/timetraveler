import D from 'debug'
import grpc from 'grpc'
import EventEmitter from 'eventemitter3'

import Queue from 'Queue'
import Timemachine from 'Timemachine'
import Timelogger from 'Timelogger'

function Timetraveler (customSettings) {
  const settings = {...defaultSettings, ...customSettings}
  validateSettings(settings)
  const debug = D('timetraveler')

  const traveler = new EventEmitter()

  const {
    fromEvent,
    batchSize,
    eventStoreAddress,
    eventStoreCredentials,
    onEvent,
    whitelistedStreams
  } = settings

  let _traveling = false
  let _lastFetchedEventId = fromEvent

  let _fetchLogger = Timelogger(`loading of events of day`)
  let _processLogger = Timelogger(`processing of events of day`)
  let _queue = Queue({
    hwm: 500,
    processor: (event) => Promise.resolve(onEvent(event))
  })
  _queue.on('processed:event', (event) => {
    _processLogger.log(event.stored)
  })
  _queue.on('processing:error', (event, error) => {
    console.error()
    console.error(`Error processing event:`)
    console.error(JSON.stringify(event, null, 2))
    console.error(error)
    console.error()
  })
  _queue.on('hwm:alert', () => {
    console.log()
    console.log(`QUEUE HIGH WATER MARK REACHED`)
    console.log()
  })
  _queue.on('hwm:calm', () => {
    console.log()
    console.log(`QUEUE IS NO MORE OVER HIGH WATER MARK THRESHOLD`)
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
    whitelistedStreams,
    batchSize
  })
  _timemachine.on('event', (event) => {
    _lastFetchedEventId = event.id
    _fetchLogger.log(event.stored)
    _queue.add(event)
  })
  _timemachine.on('subscribing', () => {
    console.log('SUBSCRIBED TO LIVE EVENTS')
  })
  _timemachine.on('subscription:interrupt', () => {
    console.log('SUBSCRIPTION TO EVENTS INTERRUPTED')
  })

  function start () {
    if (_traveling) return traveler
    _traveling = true
    debug(`starting to timetravel from event id ${_lastFetchedEventId}`)
    _timemachine.start(_lastFetchedEventId)
    return traveler
  }
  function stop () {
    if (!_traveling) return traveler
    _traveling = false
    debug(`stopping timetravel`)
    _queue.stop()
    _timemachine.stop()
    return traveler
  }

  return Object.defineProperties(traveler, {
    start: {value: start},
    stop: {value: stop}
  })
}

const defaultSettings = {
  fromEvent: 0,
  batchSize: 1000,
  onEvent: () => Promise.resolve(),
  eventStoreCredentials: grpc.credentials.createInsecure()
}

function validateSettings (settings) {
  let { eventStoreAddress } = settings
  if (!eventStoreAddress || typeof eventStoreAddress !== 'string') throw new Error(`eventStoreAddress should be a notempty string`)
}

export default Timetraveler
