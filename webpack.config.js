const path = require('path')
const os = require('os')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin')
const HardSourceWebpackPlugin = require('hard-source-webpack-plugin')
const TerserPlugin = require('terser-webpack-plugin')
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')

const buildStart = (new Date()).toLocaleString()
console.log(`run on ${os.cpus().length} CPUs`)

const webpackConfig = {
  entry: {
    app: './src/scripts/index.ts',
    normalize: 'normalize.css',
    style: './src/styles/style.scss',
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'umd',
  },
  devtool: 'source-map',
  devServer: {
    contentBase: path.resolve(__dirname, 'src/assets'),
  },
  mode: 'development',
  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      inject: false,
      template: 'src/assets/template.ejs',
      buildTime: buildStart,
      env: process.env.NODE_ENV,
    }),
    new CopyPlugin([{ from: 'src/assets/sample_docs', to: '../dist/sample_docs' }]),
  ],
  resolve: {
    alias: {
      vue: 'vue/dist/vue.esm.js',
    },
    extensions: ['.tsx', '.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              // transpileOnly: true,
              experimentalWatchApi: true,
            },
          },
          {
            loader: 'eslint-loader',
            options: {
              cache: true,
              quiet: true,
            },
          },
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.scss$/,
        use: [
          'style-loader',
          'css-loader',
          'postcss-loader',
        ],
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
        ],
      },
    ],
  },
}

if (process.env.NODE_ENV === 'demo') {
  webpackConfig.optimization = {
    minimize: true,
    minimizer: [new TerserPlugin({
      sourceMap: false,
      parallel: os.cpus().length,
    })],
  }
  webpackConfig.mode = 'production'
  delete webpackConfig.devtool
  // webpackConfig.plugins.unshift(new BundleAnalyzerPlugin())
} else {
  webpackConfig.plugins.unshift(new HardSourceWebpackPlugin())
}

module.exports = webpackConfig
