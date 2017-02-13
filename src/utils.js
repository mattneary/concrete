import {flatten, split, reject, isEmpty} from 'lodash/fp'

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
