const escape = str => str.replace(/'/g, `''`);
const escapeFetchParam = str => encodeURIComponent(escape(str));
const formatLikeOperator = value => escapeFetchParam(`%${value}%`);

module.exports = {
  escapeFetchParam,
  formatLikeOperator,
};
