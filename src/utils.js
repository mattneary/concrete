import {flatten, split, reject, isEmpty, clone, min, findLastIndex} from 'lodash/fp'

const intersperse = (elm, list) => {
  const xs = []
  list.forEach(x => {
    xs.push(x)
    xs.push(elm)
  })
  return xs.length ? xs.slice(0, -1) : xs
}

export const breakAt = (strs, x) => {
  const toSplit = [x]
  return strs.reduce((fragments, delim) =>
    flatten(fragments.map(split(delim)).map(
      segments => reject(isEmpty, intersperse(delim, segments)),
    )), toSplit,
  )
}

export const listSplit = delim => xs => {
  const lists = []
  let currentList = []
  xs.forEach(x => {
    if (delim(x)) {
      if (currentList.length) lists.push(currentList)
      currentList = []
    } else {
      currentList.push(x)
    }
  })
  if (currentList.length) lists.push(currentList)
  return lists
}

export const getSignature = x => x.map(({type, delim}) => type === 'group' ? delim : type)
export const splitArgs = listSplit(({type, value}) => type === 'punctuation' && value === ',')
export const splitStatements = listSplit(({type, value}) => (
  (type === 'punctuation' && value === ';') ||
  (type === 'linebreak')
))

const isOp = ({type}) => type === 'operator'
export const groupOperators = (precedence, prefix) => expr => {
  // Rewrite infix operator ASTs like `a + b * 2` as `+(a, *(b, 2))`.
  // Note: this function expects operators to be represented as {type:
  // 'operator', value : string}. This expression type does not exist in
  // tokenLang.
  const recurse = xs => {
    const isConsecutive = (x, i) => isOp(x) && (i === 0 || isOp(xs[i - 1]))
    const isOpArray = xs.map(isOp)
    const ops = xs.filter(isOp)
    if (!ops.length) return xs
    const consecutiveOps = xs.map(isConsecutive)
    const prefixIndex = findLastIndex(x => x, consecutiveOps)
    if (prefixIndex !== -1) {
      const selectedOp = xs[prefixIndex]
      if (!prefix.includes(selectedOp.value)) {
        throw new Error(`Unxexpected ${selectedOp.value}. Must be used infix.`)
      }
      if (prefixIndex === xs.length - 1) {
        throw new Error(`Expected a value following ${selectedOp.value}.`)
      }
      const newExprs = clone(xs)
      const nextOpIndex = isOpArray.indexOf(true, prefixIndex + 1)
      const rewriteCount = nextOpIndex === -1
        ? xs.length - prefixIndex
        : nextOpIndex - prefixIndex
      const governed = nextOpIndex === -1
        ? xs.slice(prefixIndex + 1)
        : xs.slice(prefixIndex + 1, rewriteCount + prefixIndex)
      newExprs.splice(prefixIndex, rewriteCount, [
        {type: 'symbol', value: selectedOp.value},
        {type: 'group', value: governed},
      ])
      return recurse(newExprs)
    }
    const minPrecedence = min(ops.map(({value}) => precedence[value]))
    const minLoc = xs.findIndex(({type, value}) => (
      type === 'operator' && precedence[value] === minPrecedence
    ))
    const selectedOp = xs[minLoc]
    if (minLoc < 1 || minLoc === xs.length - 1) {
      throw new Error(`Unexpected operator ${selectedOp.value}.`)
    }
    const newExprs = clone(xs)
    const nextOpIndex = isOpArray.indexOf(true, minLoc + 1)
    const prevOpIndex = isOpArray.slice(0, minLoc).lastIndexOf(true)
    const rewriteRightCount = nextOpIndex === -1
      ? xs.length - minLoc
      : nextOpIndex - minLoc - 1
    const governedRight = nextOpIndex === -1
      ? xs.slice(minLoc + 1)
      : xs.slice(minLoc + 1, rewriteRightCount + minLoc + 1)
    const rewriteLeftCount = prevOpIndex === -1
      ? minLoc
      : minLoc - prevOpIndex - 1
    const governedLeft = xs.slice(minLoc - rewriteLeftCount, minLoc)
    newExprs.splice(minLoc - rewriteLeftCount, 1 + rewriteLeftCount + rewriteRightCount, [
        {type: 'symbol', value: selectedOp.value},
        {type: 'group', value: [...governedLeft, {type: 'comma'}, ...governedRight]},
    ])
    return recurse(newExprs)
  }
  return recurse(expr)
}
