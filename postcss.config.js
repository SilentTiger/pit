module.exports = ({ file, options, env }) => ({
  parser: file.extname === '.sss' ? 'sugarss' : false,
  plugins: {
    'postcss-import': {},
    'postcss-cssnext': {},
    'cssnano': env === 'production' ? {} : false
  }
})