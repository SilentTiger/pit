const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CleanWebpackPlugin = require('clean-webpack-plugin')

module.exports = {
  entry: {
    app: './src/index.ts',
    normalize: 'normalize.css',
    style: './src/style.css'
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  devtool: 'source-map',
  devServer: {
    contentBase: './dist'
  },
  plugins: [
    new CleanWebpackPlugin(['dist']),
    new HtmlWebpackPlugin({
      inject: false,
      template: 'src/template.ejs'
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