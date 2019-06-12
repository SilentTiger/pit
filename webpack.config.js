const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin');

const buildStart = (new Date()).toLocaleString();

module.exports = {
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
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      inject: false,
      template: 'src/assets/template.ejs',
      buildTime: buildStart
    }),
    new CopyPlugin([{ from: 'src/assets/sample_docs', to: '../dist/sample_docs' }])
  ],
  resolve: {
    extensions: ['.tsx', '.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [{
          loader: 'ts-loader',
          options: {
            // transpileOnly: true,
            experimentalWatchApi: true,
          },
        }],
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