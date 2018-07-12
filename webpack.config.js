const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CleanWebpackPlugin = require('clean-webpack-plugin')

module.exports = {
  entry: {
    app: './src/scripts/index.ts',
    engine: './src/scripts/Engine.ts',
    loader: './src/scripts/Loader.ts',
    normalize: 'normalize.css',
    style: './src/styles/style.scss'
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  devtool: 'source-map',
  devServer: {
    contentBase: './dist'
  },
  mode: 'development',
  plugins: [
    new CleanWebpackPlugin(['dist']),
    new HtmlWebpackPlugin({
      inject: false,
      template: 'src/assets/template.ejs'
    })
  ],
  resolve: {
    extensions: [ '.tsx', '.ts', '.js' ]
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [{
          loader: 'ts-loader',
          options: {
              transpileOnly: true,
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
          'postcss-loader',
          'sass-loader'
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