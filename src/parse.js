import {
  includes, compose, map, reduce, concat,
} from 'lodash/fp'
import {listSplit} from './utils'
import structureParse from './structure'

const getSignature = x => x.map(({type, delim}) => type === 'group' ? delim : type)

const infix = x => {
  const signature = getSignature(x)
  // TODO: operator precedence and unary operators
  if (signature.length === 3 && signature[1] === 'punctuation') {
    return {type: 'infix', left: expression(x[0]), right: expression(x[2])}
  }
  throw new Error('Could not parse operators')
}
const expression = x => {
  if (!Array.isArray(x)) {
    // The bare token base-case. If it's paren-wrapped, recurse on its
    // contents. Otherwise, return it.
    const {type, value} = x
    if (type === 'group') return expression(value)
    return x
  }
  if (x.length === 1) {
    // Single token expressions evaluate to their only token.
    return expression(x[0])
  }
  const exprs = x.filter(({type}) => type !== 'linebreak')
  const signature = getSignature(exprs)
  if (includes('punctuation', signature)) return infix(x)
  if (signature.length === 2 && signature[1] === '(') {
    const splitArgs = listSplit(({type, value}) => type === 'punctuation' && value === ',')
    return {
      type: 'invocation',
      fn: expression(exprs[0]),
      args: splitArgs(exprs[1].value).map(expression),
    }
  }
  throw new Error('Could not parse')
}

const script = x => {
  const splitStatements = compose(
    reduce(concat, []),
    map(listSplit(
      ({type, value}) => type === 'punctuation' && value === ';',
    )),
    listSplit(({type}) => type === 'linebreak', x),
  )
  return splitStatements(x).map(expression)
}

const parse = compose(script, structureParse)
export default parse
