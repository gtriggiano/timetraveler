'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.toDatesRange = exports.isRangeOfDurationDate = exports.isRangeOfDateDuration = exports.isRangeOfDateDate = exports.isDuration = exports.isDate = undefined;

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const DATE = 'Date';
const DURATION = 'Duration';
const RANGE_DATE_DATE = 'Range of Date/Date';
const RANGE_DATE_DURATION = 'Range of Date/Duration';
const RANGE_DURATION_DATE = 'Range of Duration/Date';

// Kudos to https://gist.github.com/philipashlock/8830168
const regex = {
  [DATE]: /^([+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\3([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))([T\s]((([01]\d|2[0-3])((:?)[0-5]\d)?|24:?00)([.,]\d+(?!:))?)?(\17[0-5]\d([.,]\d+)?)?([zZ]|([+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)?$/,
  [DURATION]: /^(R\d*\/)?P(?:\d+(?:\.\d+)?Y)?(?:\d+(?:\.\d+)?M)?(?:\d+(?:\.\d+)?W)?(?:\d+(?:\.\d+)?D)?(?:T(?:\d+(?:\.\d+)?H)?(?:\d+(?:\.\d+)?M)?(?:\d+(?:\.\d+)?S)?)?$/,
  [RANGE_DATE_DATE]: /^([+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\3([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))([T\s]((([01]\d|2[0-3])((:?)[0-5]\d)?|24:?00)([.,]\d+(?!:))?)?(\17[0-5]\d([.,]\d+)?)?([zZ]|([+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)?(\/)([+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\3([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))([T\s]((([01]\d|2[0-3])((:?)[0-5]\d)?|24:?00)([.,]\d+(?!:))?)?(\17[0-5]\d([.,]\d+)?)?([zZ]|([+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)?$/,
  [RANGE_DATE_DURATION]: /^(R\d*\/)?([+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\4([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))([T\s]((([01]\d|2[0-3])((:?)[0-5]\d)?|24:?00)([.,]\d+(?!:))?)?(\18[0-5]\d([.,]\d+)?)?([zZ]|([+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)?(\/)P(?:\d+(?:\.\d+)?Y)?(?:\d+(?:\.\d+)?M)?(?:\d+(?:\.\d+)?W)?(?:\d+(?:\.\d+)?D)?(?:T(?:\d+(?:\.\d+)?H)?(?:\d+(?:\.\d+)?M)?(?:\d+(?:\.\d+)?S)?)?$/,
  [RANGE_DURATION_DATE]: /^(R\d*\/)?P(?:\d+(?:\.\d+)?Y)?(?:\d+(?:\.\d+)?M)?(?:\d+(?:\.\d+)?W)?(?:\d+(?:\.\d+)?D)?(?:T(?:\d+(?:\.\d+)?H)?(?:\d+(?:\.\d+)?M)?(?:\d+(?:\.\d+)?S)?)?\/([+-]?\d{4}(?!\d{2}\b))((-?)((0[1-9]|1[0-2])(\4([12]\d|0[1-9]|3[01]))?|W([0-4]\d|5[0-2])(-?[1-7])?|(00[1-9]|0[1-9]\d|[12]\d{2}|3([0-5]\d|6[1-6])))([T\s]((([01]\d|2[0-3])((:?)[0-5]\d)?|24:?00)([.,]\d+(?!:))?)?(\18[0-5]\d([.,]\d+)?)?([zZ]|([+-])([01]\d|2[0-3]):?([0-5]\d)?)?)?)?$/
};

const isDate = exports.isDate = str => regex[DATE].test(str);
const isDuration = exports.isDuration = str => regex[DURATION].test(str);
const isRangeOfDateDate = exports.isRangeOfDateDate = str => regex[RANGE_DATE_DATE].test(str);
const isRangeOfDateDuration = exports.isRangeOfDateDuration = str => regex[RANGE_DATE_DURATION].test(str);
const isRangeOfDurationDate = exports.isRangeOfDurationDate = str => regex[RANGE_DURATION_DATE].test(str);

const toDayBeginning = date => date;
const toDayEnd = date => date;

const toDatesRange = exports.toDatesRange = timeString => {
  if (isDate(timeString)) {
    const date = new Date(timeString);
    return {
      from: toDayBeginning(date),
      to: toDayEnd(date)
    };
  }

  if (isDuration(timeString)) {
    const now = new Date();
    return {
      from: new Date(now - _moment2.default.duration(timeString).milliseconds()),
      to: now
    };
  }

  if (isRangeOfDateDate(timeString)) {
    var _timeString$split = timeString.split('/'),
        _timeString$split2 = _slicedToArray(_timeString$split, 2);

    const aStr = _timeString$split2[0],
          bStr = _timeString$split2[1];

    const a = new Date(aStr);
    const b = new Date(bStr);
    return {
      from: a < b ? a : b,
      to: a >= b ? a : b
    };
  }

  if (isRangeOfDateDuration(timeString)) {
    var _timeString$split3 = timeString.split('/'),
        _timeString$split4 = _slicedToArray(_timeString$split3, 2);

    const dateStr = _timeString$split4[0],
          durStr = _timeString$split4[1];

    const from = new Date(dateStr);
    return {
      from,
      to: new Date(from + _moment2.default.duration(durStr).milliseconds())
    };
  }

  if (isRangeOfDurationDate(timeString)) {
    var _timeString$split5 = timeString.split('/'),
        _timeString$split6 = _slicedToArray(_timeString$split5, 2);

    const durStr = _timeString$split6[0],
          dateStr = _timeString$split6[1];

    const to = new Date(dateStr);
    return {
      from: new Date(to - _moment2.default.duration(durStr).milliseconds()),
      to
    };
  }

  throw new Error(`not a valid timeString: ${timeString}`);
};