function dedupeList(values) {
  return Array.from(new Set(values.filter(v => !!v)));
}

module.exports = dedupeList;
