import moment from 'moment'

const DATE = 'Date'
const DURATION = 'Duration'
const RANGE_DATE_DATE = 'Range of Date/Date'
const RANGE_DATE_DURATION = 'Range of Date/Duration'
const RANGE_DURATION_DATE = 'Range of Duration/Date'

// Kudos to https://gist.github.com/philipashlock/8830168
const regex = {
  [DATE]: /^([+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\3([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))([T\s]((([01]\d|2[0-3])((:?)[0-5]\d)?|24:?00)([.,]\d+(?!:))?)?(\17[0-5]\d([.,]\d+)?)?([zZ]|([+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)?$/,
  [DURATION]: /^(R\d*\/)?P(?:\d+(?:\.\d+)?Y)?(?:\d+(?:\.\d+)?M)?(?:\d+(?:\.\d+)?W)?(?:\d+(?:\.\d+)?D)?(?:T(?:\d+(?:\.\d+)?H)?(?:\d+(?:\.\d+)?M)?(?:\d+(?:\.\d+)?S)?)?$/,
  [RANGE_DATE_DATE]: /^([+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\3([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))([T\s]((([01]\d|2[0-3])((:?)[0-5]\d)?|24:?00)([.,]\d+(?!:))?)?(\17[0-5]\d([.,]\d+)?)?([zZ]|([+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)?(\/)([+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\3([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))([T\s]((([01]\d|2[0-3])((:?)[0-5]\d)?|24:?00)([.,]\d+(?!:))?)?(\17[0-5]\d([.,]\d+)?)?([zZ]|([+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)?$/,
  [RANGE_DATE_DURATION]: /^(R\d*\/)?([+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\4([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))([T\s]((([01]\d|2[0-3])((:?)[0-5]\d)?|24:?00)([.,]\d+(?!:))?)?(\18[0-5]\d([.,]\d+)?)?([zZ]|([+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)?(\/)P(?:\d+(?:\.\d+)?Y)?(?:\d+(?:\.\d+)?M)?(?:\d+(?:\.\d+)?W)?(?:\d+(?:\.\d+)?D)?(?:T(?:\d+(?:\.\d+)?H)?(?:\d+(?:\.\d+)?M)?(?:\d+(?:\.\d+)?S)?)?$/,
  [RANGE_DURATION_DATE]: /^(R\d*\/)?P(?:\d+(?:\.\d+)?Y)?(?:\d+(?:\.\d+)?M)?(?:\d+(?:\.\d+)?W)?(?:\d+(?:\.\d+)?D)?(?:T(?:\d+(?:\.\d+)?H)?(?:\d+(?:\.\d+)?M)?(?:\d+(?:\.\d+)?S)?)?\/([+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\4([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))([T\s]((([01]\d|2[0-3])((:?)[0-5]\d)?|24:?00)([.,]\d+(?!:))?)?(\18[0-5]\d([.,]\d+)?)?([zZ]|([+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)?$/
}

export const isDate = str => regex[DATE].test(str)
export const isDuration = str => regex[DURATION].test(str)
export const isRangeOfDateDate = str => regex[RANGE_DATE_DATE].test(str)
export const isRangeOfDateDuration = str => regex[RANGE_DATE_DURATION].test(str)
export const isRangeOfDurationDate = str => regex[RANGE_DURATION_DATE].test(str)

const toDayBeginning = date => date
const toDayEnd = date => date

export const toDatesRange = timeString => {
  if (isDate(timeString)) {
    const date = new Date(timeString)
    return {
      from: toDayBeginning(date),
      to: toDayEnd(date)
    }
  }

  if (isDuration(timeString)) {
    const now = new Date()
    return {
      from: new Date(now - moment.duration(timeString).milliseconds()),
      to: now
    }
  }

  if (isRangeOfDateDate(timeString)) {
    const [aStr, bStr] = timeString.split('/')
    const a = new Date(aStr)
    const b = new Date(bStr)
    return {
      from: a < b ? a : b,
      to: a >= b ? a : b
    }
  }

  if (isRangeOfDateDuration(timeString)) {
    const [dateStr, durStr] = timeString.split('/')
    const from = new Date(dateStr)
    return {
      from,
      to: new Date(from + moment.duration(durStr).milliseconds())
    }
  }

  if (isRangeOfDurationDate(timeString)) {
    const [durStr, dateStr] = timeString.split('/')
    const to = new Date(dateStr)
    return {
      from: new Date(to - moment.duration(durStr).milliseconds()),
      to
    }
  }

  throw new Error(`not a valid timeString: ${timeString}`)
}
