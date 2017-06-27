import path from 'path'
import http from 'http'

import express from 'express'

import socket from './socket'
import stateTimeseriesEndpoint from './stateTimeseriesEndpoint'

export default function Dashboard (timetraveler) {
  const app = express()
  const httpServer = http.Server(app)
  const io = socket(httpServer, timetraveler)

  app.get('/states-in-timerange/:timeRange',
    (req, res, next) => {
      req.timeRange = req.params.timeRange
      next()
    },
    stateTimeseriesEndpoint(timetraveler))
  app.use(express.static(path.resolve(__dirname, 'static')))

  return {
    app,
    httpServer,
    io
  }
}
