import test from 'ava'

import {parse} from '..'

const parseLisp = x => {
  const translate = x => {
    if (Array.isArray(x)) {
      return x.filter(({type}) => type !== 'linebreak').map(translate)
    }
    const {type, value, delim} = x
    if (type === 'group') {
      if (delim !== '(') throw new Error('That\'s not lisp!')
      return value.map(translate)
    }
    if (type === 'string') return JSON.stringify(value)
    return value
  }
  return translate(parse(x))
}

const stringifyLisp = xs => {
  const stringifySingle = x => {
    if (Array.isArray(x)) {
      return `(${x.map(stringifySingle).join(' ')})`
    }
    return x
  }
  return xs.map(stringifySingle).join('\n')
}

const parses = (t, expr, expected) => {
  t.is(expected || expr, stringifyLisp(parseLisp(expr)))
}
parses.title = expr => `parses ${expr}`

test('parse', parses, '(+ 1 (* 3 4))')
test('parse', parses, '(define (f x) (* x 2))')
