import {
  includes, compose, map, reduce, concat,
} from 'lodash/fp'
import {listSplit, getSignature, splitArgs, splitStatements} from './utils'
import structureParse from './structure'

const hasInfix = signature =>
  signature.length === 3 && signature[1] === 'punctuation'
const hasPrefix = signature =>
  signature.length === 2 && signature[0] === 'punctuation'

const groupOperators = x => {
  const precedence = {
    '*': 0,
    '+': 1,
  }
  const prefix = ['-']
  const signature = getSignature(x)
  if (hasInfix(signature) || hasPrefix(signature)) return x
  if (signature[1] === 'punctuation' && signature[3] === 'punctuation') {
    return groupOperators(
      precedence[x[1].value] < precedence[x[3].value]
        ? [{type: 'group', delim: '(', value: x.slice(0, 3)}, ...x.slice(3)]
        : [...x.slice(0, 2), {type: 'group', delim: '(', value: x.slice(2, 5)}, ...x.slice(5)]
    )
  } else if (signature[0] === 'punctuation' && signature[2] === 'punctuation') {
    return groupOperators(
      precedence[x[0].value] < precedence[x[2].value]
        ? [{type: 'group', delim: '(', value: x.slice(0, 2)}, ...x.slice(2)]
        : [x[0], {type: 'group', delim: '(', value: x.slice(1, 4)}, ...x.slice(4)]
    )
  }
  throw new Error('Operator usage could not be understood.')
}

const infix = x => {
  const signature = getSignature(x)
  if (hasInfix(signature)) {
    return {type: 'infix', op: x[1].value, left: expression(x[0]), right: expression(x[2])}
  } else if (hasPrefix(signature)) {
    return {type: 'prefix', op: x[0].value, operand: expression(x[1])}
  }
  const grouped = groupOperators(x)
  const newSignature = getSignature(grouped)
  if (!hasInfix(newSignature) && !hasPrefix(newSignature)) {
    throw new Error('Operator usage could not be understood.')
  }
  return infix(grouped)
}

const expression = x => {
  if (!Array.isArray(x)) {
    // The bare token base-case. If it's bracket-wrapped, recurse on its
    // contents. Otherwise, return it.
    const {type, value, delim} = x
    if (type === 'group') {
      if (delim === '(') return expression(value)
      return {type: 'list', value: splitArgs(value).map(expression)}
    }
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
    return {
      type: 'invocation',
      fn: expression(exprs[0]),
      args: splitArgs(exprs[1].value).map(expression),
    }
  }
  throw new Error('Could not parse')
}

const script = x => splitStatements(x).map(expression)

const parse = compose(script, structureParse)
export default parse
