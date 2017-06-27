import {
  toDatesRange
} from '../utils'

export default function stateTimeseriesEndpoint (timetraveler) {
  return (req, res) => {
    let datesRange

    try {
      datesRange = toDatesRange(req.timeRange)
    } catch (e) {
      res.status(400).send({
        error: e.message
      })
      return
    }
    const { from, to } = datesRange
    let states = timetraveler.getStatesInDateRange(from, to)
    res.send(states)
  }
}
