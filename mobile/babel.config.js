module.exports = function (api) {
  api.cache(true)
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      // Must stay last — react-native-worklets rewrites function bodies and
      // has to run after every other transform.
      'react-native-worklets/plugin',
    ],
  }
}
