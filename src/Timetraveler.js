import D from 'debug'
import grpc from 'grpc'
import EventEmitter from 'eventemitter3'
import {
  first,
  pick,
  throttle
} from 'lodash'

import EventProcessingQueue from './EventProcessingQueue'
import Timemachine from './Timemachine'

const essentialEvent = event => pick(event, ['id', 'storedOn'])

/**
 * Provides a traveler instance
 * @param {[Object]} customSettings [description]
 * @param {[String]} customSettings.fromEventId
 * @param {[Integer]} customSettings.batchSize
 * @param {[Integer]} customSettings.hwm
 * @param {[Integer]} customSettings.lwm
 * @param {[GRPC Credentials]} customSettings.eventStoreCredentials
 * @param {[Function]} customSettings.eventHandler
 */
function Timetraveler (customSettings) {
  const settings = {...Timetraveler.defaultSettings, ...customSettings}
  validateSettings(settings)
  const debug = D('timetraveler')

  /**
   * The traveler intance
   */
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

  let state = {
    lwm,
    hwm,
    travelling: false,
    subscribed: false,
    lastFetchedEvent: null,
    lastProcessedEvent: null
  }

  /**
   * The internal queue of events to process
   */
  const _queue = EventProcessingQueue({lwm, hwm, eventHandler})

  /**
   * The internals timed snapshots of the states of the traveler
   * @type {Array}
   */
  const statesTimeserie = []

  /**
   * When invoked the traveler emits it state
   * and stores a timed snapshot of it
   * @return {[type]} [description]
   */
  const broadcastState = throttle(() => {
    let actualState = {...state, queueSize: _queue.size}
    statesTimeserie.push({
      t: new Date(),
      qs: actualState.queueSize,
      tr: actualState.travelling,
      ss: actualState.subscribed
    })
    traveler.emit('state', actualState)
  }, 400, {leading: true, trailing: true})

  _queue.on('processed:event', event => {
    state.lastProcessedEvent = essentialEvent(event)
    broadcastState()
  })
  _queue.on('processing:error', (event, error) => {
    // Propagate the processing error for UI or other consumers
    traveler.emit('eventProcessingError', event, error)
  })
  _queue.on('hwm', () => {
    console.log()
    console.log(`${new Date()} Timetraveler QUEUE HIGH WATER MARK REACHED`)
    console.log()
    if (state.travelling) _timemachine.stop()
  })
  _queue.on('lwm', () => {
    console.log()
    console.log(`${new Date()} Timetraveler QUEUE LOW WATER MARK REACHED`)
    console.log()
    let lastFetchedEventId = state.lastFetchedEvent
      ? state.lastFetchedEvent.id
      : fromEventId
    if (state.travelling) _timemachine.start(lastFetchedEventId)
  })

  /**
   * The internal timemachine extracting the
   * events from the eventstore
   */
  let _timemachine = Timemachine({
    eventStoreAddress,
    eventStoreCredentials,
    batchSize
  })
  _timemachine.on('event', event => {
    state.lastFetchedEvent = essentialEvent(event)
    _queue.add(event)
    broadcastState()
  })
  _timemachine.on('subscribed', () => {
    state.subscribed = true
    broadcastState()
  })
  _timemachine.on('unsubscribed', () => {
    state.subscribed = false
    broadcastState()
  })

  /**
   * Starts the traveler work
   *
   * Fetching starts from the last fetched event id or
   * from the id passed at instantiation time
   */
  const start = () => {
    if (state.travelling) return traveler
    state.travelling = true
    let lastFetchedEventId = state.lastFetchedEvent
      ? state.lastFetchedEvent.id
      : fromEventId
    debug(`starting timetravel from event id ${lastFetchedEventId}`)
    _timemachine.start(lastFetchedEventId)
    broadcastState()
    return traveler
  }
  /**
   * Stops the traveler work
   *
   * Queue stops to process events
   * Timemachine stops to fetch
   * Already queued events stay queued
   * @return {[type]} [description]
   */
  const stop = () => {
    if (!state.travelling) return traveler
    state.travelling = false
    debug(`stopping timetravel`)
    _queue.stop()
    _timemachine.stop()
    broadcastState()
    return traveler
  }

  // It is lazy loaded
  let dashboardApp = null

  /**
   * Instance composition
   */
  return Object.defineProperties(traveler, {
    start: {value: start},
    stop: {value: stop},
    state: {get: () => ({...state, queueSize: _queue.size})},
    startedOn: {get: () => {
      let firstState = first(statesTimeserie)
      return (firstState && firstState.t) || null
    }},
    getStatesInDateRange: {
      value: (from, to) => statesTimeserie.filter(({t}) => t >= from && t <= to).map(i => ({...i}))
    },
    ui: {get: () => {
      if (!dashboardApp) {
        dashboardApp = require('./Dashboard').default(traveler)
      }
      return dashboardApp
    }}
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
