# concrete

Languages tend to look pretty similar. Pretty much all of them use quotes and
non-alphanumeric operators and braces for grouping things. `import {parse} from
'concrete'` to parse this structure out of your language. Then just map a
standard AST (more aptly, *Concrete* Syntax Tree) to yours.

The concrete syntax tree is as follows.

```js
tree : [expr]
expr : group | string | number | punctuation | linebreak | symbol
group : {type: 'group', value : [expr], delim: '(' | '[' | '{'}
string : {type: 'string', value : string}
number : {type: 'number', value : string}
punctuation : {type: 'punctuation', value : string}
linebreak : {type: 'linebreak', value : string}
symbol : {type: 'symbol', value : string}
```

See the `test/` directory for an example of parsing lisp.
