import test from 'ava'

import {parseExcel} from '..'

const parses = (t, a) => {
  t.truthy(parseExcel(a))
}
parses.title = a => `parses \`${a}\``

test('parse', parses, 'A(1 + 2 * 3, "ABC")')
test('parse', parses, '(-1) + 2')
test('parse', parses, '($AAPL) + 2')
test('parse', parses, '$("^FTSE", "LN")')
test('parse', parses, 'a = [1, 3]')
test('parse', parses, 'a = {a = 1, b = 2}')
test('parse', parses, 'u = ()')
