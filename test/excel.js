import test from 'ava'
import {clone, includes, min, last} from 'lodash/fp'

import {parse, listSplit} from '..'

const PRECEDENCE = {
  '*': 1,
  '/': 1,
  '+': 2,
  '-': 2,
}

const parseExcel = s => {
  const groupOperators = xs => {
    const ops = xs.filter(({type}) => type === 'operator')
    if (!ops.length) return xs
    const minPrecedence = min(ops.map(({value}) => PRECEDENCE[value]))
    const minLoc = xs.findIndex(({type, value}) => (
      type === 'operator' && PRECEDENCE[value] === minPrecedence
    ))
    const selectedOp = xs[minLoc]
    if (minLoc < 1 || minLoc > xs.length - 2) {
      throw new Error(`Unexpected operator ${selectedOp}.`)
    }
    const newExprs = clone(xs)
    newExprs.splice(minLoc - 1, 3, {
      type: 'group',
      value: [
        {type: 'symbol', value: selectedOp.value},
        {type: 'group', value: [xs[minLoc - 1], {type: 'comma'}, xs[minLoc + 1]]},
      ],
    })
    return groupOperators(newExprs)
  }

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
      const grouped = groupOperators(x)
      if (grouped.length === 1) return translate(grouped[0])
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
      return x.filter(({type}) => type !== 'linebreak').map(retoken)
    }
    const {type, value, delim} = x
    if (type === 'group') {
      if (delim !== '(') throw new Error(`Unexpected ${delim}.`)
      return {type, value: retoken(value)}
    }
    if (type === 'punctuation') {
      if (value === ',') return {type: 'comma'}
      if (includes(value, ['+', '*', '-', '/'])) {
        return {type: 'operator', value}
      }
      throw new Error(`Unexpected ${value}.`)
    }
    return x
  }

  return translate(retoken(parse(s)))
}

const same = (t, a, b) => {
  t.deepEqual(parseExcel(a), parseExcel(b))
}
same.title = (a, b) => `parses \`${a}\` and \`${b}\` the same`

test('parse', same, 'A(1 + 2 * 3, "ABC")', 'A(1 + (2 * 3), "ABC")')
