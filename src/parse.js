import {
  assign, toArray, fromPairs, invertObj, compose, flatten, set, last,
} from 'lodash/fp'
import {breakAt} from './utils'

const quoteLang = {
  literal: value => ({type: 'literal', value}),
  nonliteral: value => ({type: 'nonliteral', value}),
}

const delimLang = {
  ...quoteLang,
  group: (delim, value) => ({type: 'group', delim, value}),
}

const tokenLang = {
  group: delimLang.group,
  string: value => ({type: 'string', value}),
  number: value => ({type: 'number', value}),
  punctuation: value => ({type: 'punctuation', value}),
  linebreak: value => ({type: 'linebreak', value}),
  symbol: value => ({type: 'symbol', value}),
}

const parseTokens = exprs => {
  const tokenGroups = [
    ['number', /[0-9]+("."[0-9]+)?/],
    ['symbol', /[A-Za-z_]([A-Za-z0-9_]+)?/],
    ['linebreak', /\n+/],
    ['punctuation', /[,*+-/><=?$:;][=><]?/],
  ]
  const tokenize = x => {
    if (x === '') return []
    if (x.match(/^[ \t]+/)) return tokenize(x.replace(/^[ \t]+/, ''))
    for (let i = 0; i < tokenGroups.length; i += 1) {
      const [type, pattern] = tokenGroups[i]
      const match = x.match(pattern)
      if (match && match.index === 0) {
        return [
          tokenLang[type](match[0]),
          ...tokenize(x.substr(match[0].length)),
        ]
      }
    }
    throw new Error(`Expected a valid token, found ${x}.`)
  }

  return flatten(exprs.map(({type, value, ...rest}) => {
    if (type === 'literal') return [tokenLang.string(value)]
    if (type === 'group') return [{type, value: parseTokens(value), ...rest}]
    return tokenize(value)
  }))
}

const parseDelims = delims => x => {
  const isDelim = c => delims.join('').indexOf(c) !== -1
  const isOpen = c => isDelim(c) && delims.join('').indexOf(c) % 2 === 0
  const obverse = assign(
    fromPairs(delims.map(toArray)),
    invertObj(fromPairs(delims.map(toArray))),
  )

  const lexed = flatten(x.map(({type, value}) => {
    if (type === 'literal') return [{type, value}]
    return breakAt(toArray(delims.join('')), value).map(substr => ({
      type, value: substr,
    }))
  }))

  let tokens = []
  const stack = []
  const path = [0]
  lexed.forEach(({type, value}) => {
    if (isOpen(value)) {
      stack.push(value)
      tokens = set(path, delimLang.group(value, []), tokens)
      path.push('value', 0)
    } else if (isDelim(value)) {
      if (last(stack) === obverse[value]) {
        path.pop()
        path.pop()
        path.push(path.pop() + 1)
        stack.pop()
      } else {
        throw Error(`Unexpected ${value}, expected ${obverse[last(stack)]} first.`)
      }
    } else {
      tokens = set(path, {type, value}, tokens)
      path.push(path.pop() + 1)
    }
  })
  return tokens
}

const parseQuotes = x => {
  const tokens = []
  let inQuote = false
  let inEscape = false
  let currentToken = ''
  Array.from(x).forEach(c => {
    if (c === '\\') {
      if (inQuote) {
        inEscape = true
      } else {
        throw Error('slash is invalid outside of strings')
      }
    } else if (c === '"' && inQuote) {
      if (inEscape) {
        currentToken += c
      } else {
        inQuote = false
        tokens.push(quoteLang.literal(currentToken))
        currentToken = ''
      }
      inEscape = false
    } else if (c === '"') {
      tokens.push(quoteLang.nonliteral(currentToken))
      currentToken = ''
      inQuote = true
    } else {
      currentToken += c
    }
  })
  if (inEscape) throw Error('Cannot end string in slash')
  if (inQuote) throw Error('Unterminated string')
  if (currentToken.length) tokens.push(quoteLang.nonliteral(currentToken))
  return tokens
}

const parse = compose(
  parseTokens,
  parseDelims(['()', '[]', '{}']),
  parseQuotes,
)

export default parse
