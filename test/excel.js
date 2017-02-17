import test from 'ava'
import {reject, last} from 'lodash/fp'

import {parse, listSplit, groupOperators} from '..'

const PRECEDENCE = {
  '*': 1,
  '/': 1,
  '+': 2,
  '-': 2,
}
const PREFIX = ['-', '$']
const ALL_OPS = [...Object.keys(PRECEDENCE), ...PREFIX]
const groupOps = groupOperators(PRECEDENCE, PREFIX)
const isLinebreak = ({type}) => type === 'linebreak'

const parseExcel = s => {
  const getArgBody = ({value}) => {
    const argChunks = listSplit(({type}) => type === 'comma')(value)
    return argChunks.map(translate)
  }

  const nestApplications = xs => {
    if (xs.length === 1) return xs[0]
    return {
      type: 'invocation',
      fn: nestApplications(xs.slice(0, -1)),
      args: getArgBody(last(xs)),
    }
  }

  const translate = x => {
    if (Array.isArray(x)) {
      if (x.length === 1) return translate(x[0])
      const grouped = groupOps(x)
      if (grouped.length === 1) return translate(grouped[0])

      // At this point, multiple tokens means function invocation.
      const [{type}, ...rest] = grouped
      if (type !== 'symbol') throw new Error(`Expected symbol, found ${type}.`)
      const invalidToken = rest.find(({type: t}) => t !== 'group')
      if (!invalidToken) return nestApplications(grouped)
      throw new Error(`Unexpected expression of type ${invalidToken.type}.`)
    }
    const {type, value} = x
    if (type === 'group') return translate(value)
    if (type === 'number') return {type, value: parseFloat(value)}
    return x
  }

  const retoken = x => {
    if (Array.isArray(x)) {
      return reject(isLinebreak, x).map(retoken)
    }
    const {type, value, delim} = x
    if (type === 'group') {
      if (delim !== '(') throw new Error(`Unexpected ${delim}.`)
      return {type, value: retoken(value)}
    }
    if (type === 'punctuation') {
      if (value === ',') return {type: 'comma'}
      if (ALL_OPS.includes(value)) {
        return {type: 'operator', value}
      }
      throw new Error(`Unexpected ${value}.`)
    }
    return x
  }

  const retokenAll = xs => listSplit(isLinebreak)(xs).map(retoken)
  return retokenAll(parse(s)).map(translate)
}

const same = (t, a, b) => {
  t.deepEqual(parseExcel(a), parseExcel(b))
}
same.title = (a, b) => `parses \`${a}\` and \`${b}\` the same`

test('parse', same, 'A(1 + 2 * 3, "ABC")', 'A(1 + (2 * 3), "ABC")')
test('parse', same, '(-1) + 2', '-1 + 2')
test('parse', same, '($AAPL) + 2', '$AAPL + 2')
