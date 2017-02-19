import {last} from 'lodash/fp'

import parse from '../parse'
import {listSplit, groupOperators} from '../utils'

const PRECEDENCE = {
  '*': 1,
  '/': 1,
  '+': 2,
  '-': 2,
  '=': 3,
  '<=': 3,
  '<': 3,
  '>=': 3,
  '>': 3,
  '?=': 3,
  '<>': 3,
}
const PREFIX = ['-', '$']
const ALL_OPS = [...Object.keys(PRECEDENCE), ...PREFIX]
const groupOps = groupOperators(PRECEDENCE, PREFIX)
const isLinebreak = ({type, value}) => (
  type === 'linebreak' || (type === 'punctuation' && [';', ','].includes(value))
)

const parseExcel = s => {
  const getArgBody = ({value}) => {
    const argChunks = listSplit(({type}) => type === 'comma')(value)
    return argChunks.map(translate)
  }

  const nestApplications = xs => {
    if (xs.length === 1) return translate(xs[0])
    const fn = nestApplications(xs.slice(0, -1))
    if (fn[0] === 'symbol' && fn[1] === '$') {
      const {value: [arg]} = last(xs)
      if (arg.type === 'group') {
        return ['entity', ...getArgBody(arg)]
      }
      if (['symbol', 'string'].includes(arg.type)) {
        return ['entity', ['string', arg.value]]
      }
      throw new Error('Invalid entity expression.')
    }
    const args = getArgBody(last(xs))
    if (fn[0] === 'symbol' && fn[1] === '=') {
      if (args[0][0] !== 'symbol') {
        throw new Error(`Assign to symbol, not ${args[0][0]}.`)
      }
      return ['assignment', args[0][1], args[1]]
    }
    return ['call', fn, ...args]
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
    if (type === 'list') return ['list', ...getArgBody(x)]
    if (type === 'group') return translate(value)
    if (type === 'block') return ['block', value.map(translate)]
    if (type === 'number') return ['number', parseFloat(value)]
    if (type === 'string') return ['string', value]
    if (type === 'symbol') return ['symbol', value]
    if (type === 'unit') return ['unit']
    throw new Error(`Unexpected token of type ${type}.`)
  }

  const retoken = x => {
    if (Array.isArray(x)) {
      return x.filter(({type}) => type !== 'linebreak').map(retoken)
    }
    const {type, value, delim} = x
    if (type === 'group') {
      if (delim === '(') {
        if (value.length === 0) return {type: 'unit'}
        return {type, value: retoken(value)}
      }
      if (delim === '[') return {type: 'list', value: retoken(value)}
      if (delim === '{') return {type: 'block', value: retokenAll(value)}
      throw new Error(`Unexpected ${delim}.`)
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

export default parseExcel
