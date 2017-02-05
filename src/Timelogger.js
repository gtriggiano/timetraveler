function Timelogger (procName) {
  let _lastDate = null

  let logStart = (date) => console.log(`Started ${procName} ${date}`)
  let logFinish = (date) => console.log(`Finished ${procName} ${date}`)

  function log (eventDate) {
    let date = toDate(eventDate)
    if (!_lastDate) {
      _lastDate = date
      logStart(date)
      return
    }
    if (date > _lastDate) {
      logFinish(_lastDate)
      logStart(date)
    }
  }
  return Object.defineProperties({}, {
    log: {value: log}
  })
}

function toDate (date) {

}

export default Timelogger
