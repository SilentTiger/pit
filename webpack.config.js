const path = require('path');
const os = require('os')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin');
const HardSourceWebpackPlugin = require('hard-source-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

const buildStart = (new Date()).toLocaleString();
console.log(`run on ${os.cpus().length - 1} CPUs`)

const webpackConfig = {
  entry: {
    app: './src/scripts/index.ts',
    normalize: 'normalize.css',
    style: './src/styles/style.scss'
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  devtool: 'source-map',
  devServer: {
    contentBase: path.resolve(__dirname, 'src/assets')
  },
  mode: 'development',
  plugins: [
    new HardSourceWebpackPlugin(),
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      inject: false,
      template: 'src/assets/template.ejs',
      buildTime: buildStart
    }),
    new CopyPlugin([{ from: 'src/assets/sample_docs', to: '../dist/sample_docs' }])
  ],
  resolve: {
    alias: {
      vue: 'vue/dist/vue.esm.js'
    },
    extensions: ['.tsx', '.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          'cache-loader',
          {
            loader: 'ts-loader',
            options: {
              // transpileOnly: true,
              experimentalWatchApi: true,
            },
          }
        ],
        exclude: /node_modules/
      },
      {
        test: /\.scss$/,
        use: [
          'cache-loader',
          'style-loader',
          'css-loader',
          'postcss-loader'
        ]
      },
      {
        test: /\.css$/,
        use: [
          'cache-loader',
          'style-loader',
          'css-loader'
        ]
      }
    ]
  }
};

if (process.env.NODE_ENV === 'demo') {
  webpackConfig.optimization = {
    minimize: true,
    minimizer: [new TerserPlugin({
      sourceMap: false,
      parallel: os.cpus().length - 1,
    })],
  }
}

module.exports = webpackConfig