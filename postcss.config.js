module.exports = ({ file, options, env }) => ({
  parser: file.extname === '.scss' ? 'postcss-scss' : false,
  plugins: {
    'postcss-import': {},
    'postcss-cssnext': {},
    cssnano: env === 'production' ? {} : false,
  },
})
