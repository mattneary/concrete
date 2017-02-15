const toValue = ({value}) => value
const obverse = {'(': ')', '[': ']', '{': '}'}
const stringifiers = {
  group: ({value, delim}) => `${delim}${value.map(stringify).join(' ')}${obverse[delim]}`,
  string: ({value}) => JSON.stringify(value),
  number: toValue,
  punctuation: toValue,
  linebreak: toValue,
  symbol: toValue,
}

const stringify = x => {
  if (Array.isArray(x)) return x.map(stringify).join(' ')
  const {type, ...rest} = x
  if (type in stringifiers) return stringifiers[type](rest)
  throw new Error(`Invalid type ${type}`)
}

export default stringify
