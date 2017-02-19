import test from 'ava'

import {parse, stringify} from '..'

const parses = (t, expr, expected) => {
  t.is(expected || expr, stringify(parse(expr)))
}
parses.title = expr => `parses ${expr}`

test('parse', parses, 'A(1 + (2 * 3), "ABC")', 'A (1 + (2 * 3) , "ABC")')
test('parse', parses, '1 + 2 * 3')
test('parse', parses, '1 + 2 * 3 * 4 + 2')
test('parse', parses, 'A + 2; 1', 'A + 2 ; 1')
test('parse', parses, `
 A + 2
 1
`, `
 A + 2 
 1 
`)
test('parse', parses, '[A, 1, "ABC"]', '[A , 1 , "ABC"]')
test('parse', parses, '{a: 1, b: 2}', '{a : 1 , b : 2}')
test('parse', parses, 'a + ""', 'a + ""')
