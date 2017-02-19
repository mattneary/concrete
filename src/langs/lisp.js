import parse from '../parse'

const parseLisp = s => {
  const translate = x => {
    if (Array.isArray(x)) {
      return x.filter(({type}) => type !== 'linebreak').map(translate)
    }
    const {type, value, delim} = x
    if (type === 'group') {
      if (delim !== '(') throw new Error('That\'s not lisp!')
      return translate(value)
    }
    if (type === 'string') return JSON.stringify(value)
    return value
  }
  return translate(parse(s))
}


export default parseLisp
