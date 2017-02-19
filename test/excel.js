import test from 'ava'

import {parseExcel} from '..'

const same = (t, a) => {
  console.log(JSON.stringify(parseExcel(a), null, 2))
  t.truthy(parseExcel(a))
}
same.title = a => `parses \`${a}\``

test('parse', same, 'A(1 + 2 * 3, "ABC")')
test('parse', same, '(-1) + 2')
test('parse', same, '($AAPL) + 2')
test('parse', same, '$("^FTSE", "LN")')
test('parse', same, 'a = [1, 3]')
test('parse', same, 'a = {a = 1, b = 2}')
test('parse', same, 'u = ()')
