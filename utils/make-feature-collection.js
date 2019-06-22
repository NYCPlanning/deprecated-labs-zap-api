/**
 * Helper function to format an Array of features into a FeatureCollection
 *
 * @param {Object[]} features The features to format into FeatureCollection
 * @returns {Object} FeatureCollection
 */
function makeFeatureCollection(features) {
  return {
    type: 'FeatureCollection',
    features: features.map((feature) => {
      const { geom } = feature;
      delete feature.geom;

      return {
        type: 'Feature',
        geometry: JSON.parse(geom),
        properties: feature,
      };
    }),
  };
}

module.exports = { makeFeatureCollection };
