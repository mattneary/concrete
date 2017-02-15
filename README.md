# concrete

Parse text into a *concrete* syntax tree of the following form.

```js
expr : group | string | number | punctuation | linebreak | symbol
group : {type: 'group', value : [expr], delim: '(' | '[' | '{'}
string : {type: 'string', value : string}
number : {type: 'number', value : string}
punctuation : {type: 'punctuation', value : string}
linebreak : {type: 'punctuation', value : string}
symbol : {type: 'string', value : string}
```
