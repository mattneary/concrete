import test from 'ava'

import {parseExcel} from '..'

const parses = (t, a) => {
  t.truthy(parseExcel(a))
}
parses.title = a => `parses ${a}`

test('parse 1', parses, 'A(1 + 2 * 3, "ABC")')
test('parse 2', parses, '(-1) + 2')
test('parse 3', parses, '($AAPL) + 2')
test('parse 4', parses, '$("^FTSE", "LN")')
test('parse 5', parses, 'a = [1, 3]')
test('parse 6', parses, 'a = {a = 1, b = 2}')
test('parse 7', parses, 'u = ()')
test('parse 8', parses, '1 <> 2')
test('parse 9', parses, '-A(1, 2) > 3')
test('parse 10', parses, '2 * 3 + 1')
