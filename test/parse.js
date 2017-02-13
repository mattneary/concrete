import test from 'ava'

import {parse} from '..'

const parses = (t, expr) => {
  console.log(expr, JSON.stringify(parse(expr), null, 2))
  t.truthy(parse(expr))
}
parses.title = expr => `parses ${expr}`

test('parse', parses, 'A(1 + (2 * 3), "ABC")')
test('parse', parses, '1 + 2 * 3')
test('parse', parses, '1 + 2 * 3 * 4 + 2')
test('parse', parses, 'A + 2; 1')
test('parse', parses, `
 A + 2
 1
`)
test('parse', parses, '[A, 1, "ABC"]')
