function forIlike(values) {
  if(!Array.isArray(values)) return `'%{values}%'`;
  return values.map(v => `'%${v}%'`).join(',');
}

function forIn(values) {
  return values.map(v => `'${v}'`).join(',');
}

module.exports = {
  forIlike,
  forIn,
};
