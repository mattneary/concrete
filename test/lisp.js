import test from 'ava'

import {parseLisp} from '..'

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
