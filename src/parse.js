import {
  includes, assign, toArray, fromPairs, invertObj, compose, flatten, set, last,
} from 'lodash/fp'
import {breakAt, listSplit} from './utils'

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

// Structural parsers and their ASTs
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
    ['number', /[0-9]+/],
    ['symbol', /[A-Za-z][A-Za-z0-9]*/],
    ['linebreak', /\n+/],
    ['punctuation', /[^A-Za-z0-9]/],
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
    throw new Error('Expected token')
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
        throw Error('slash is invalid outside of literals')
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
  if (inEscape) throw Error('Cannot end expression in slash')
  if (inQuote) throw Error('Unterminated string')
  if (currentToken.length) tokens.push(quoteLang.nonliteral(currentToken))
  return tokens
}

const parse = compose(
  parseMessage,
  parseTokens,
  parseDelims(['()', '[]']),
  parseQuotes,
)
export default parse
