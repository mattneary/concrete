import {
  includes, assign, toArray, fromPairs, invertObj, compose, flatten, set, last,
} from 'lodash/fp'
import {breakAt, listSplit} from './utils'
import structureParse from './structure'

// Top-level language parser
const getSignature = x => x.map(({type, delim}) => type === 'group' ? delim : type)
const parseOps = x => {
  const signature = getSignature(x)
  // TODO: operator precedence and unary operators
  if (signature.length === 3 && signature[1] === 'punctuation') {
    return {type: 'infix', left: parseSingle(x[0]), right: parseSingle(x[2])}
  }
  throw new Error('Could not parse operators')
}
const parseSingle = x => {
  if (!Array.isArray(x)) {
    // The bare token base-case. If it's paren-wrapped, recurse on its
    // contents. Otherwise, return it.
    const {type, value} = x
    if (type === 'group') return parseSingle(value)
    return x
  }
  if (x.length === 1) {
    // Single token expressions evaluate to their only token.
    return parseSingle(x[0])
  }
  const exprs = x.filter(({type}) => type !== 'linebreak')
  const signature = getSignature(exprs)
  if (includes('punctuation', signature)) return parseOps(x)
  if (signature.length === 2 && signature[1] === '(') {
    return {
      type: 'invocation',
      fn: parseSingle(exprs[0]),
      args: parseMulti(',')(exprs[1].value),
    }
  }
  throw new Error('Could not parse')
}
const parseMulti = delim => x => listSplit(({type, value}) =>
  type === 'punctuation' && value === delim, x,
).map(parseSingle)

const parseMessage = x => {
  const statements = listSplit(({type}) => type === 'linebreak', x)
  return flatten(statements.map(parseMulti(';')))
}

const parse = compose(
  parseMessage,
  structureParse,
)
export default parse
