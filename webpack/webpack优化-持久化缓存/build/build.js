'use strict'

const webpack = require('webpack')
const path = require('path')
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

module.exports = {
  context: path.resolve(__dirname, '../'), // 设置工程根目录
  entry: { // 入口
    app: './src/main.js',
    a: './src/a.js',
    b: './src/b.js'
  },
  output: { // 出口
    path: path.resolve(__dirname, '../dist'), // 打包至根目录 dist 文件夹下
    // chunkFilename: '[name].[hash].js',
    filename: '[name].[chunkhash].js'
  },
  module: {
    rules: []
  },
  plugins: [
    // new webpack.optimize.CommonsChunkPlugin({
    //   name: 'vendor',
    //   minChunks (module) {
    //     return (
    //       module.resource &&
    //       /\.js$/.test(module.resource) &&
    //       module.resource.indexOf(
    //         path.join(__dirname, '../node_modules')
    //       ) === 0
    //     )
    //   }
    // }),
    // new webpack.optimize.CommonsChunkPlugin({
    //   async: 'vendor-async',
    //   minChunks (module) {
    //     return (
    //       module.resource &&
    //       /\.js$/.test(module.resource) &&
    //       module.resource.indexOf(
    //         path.join(__dirname, '../node_modules')
    //       ) === 0
    //     )
    //   }
    // }),
    new webpack.optimize.CommonsChunkPlugin({
      name: 'common',
      minChunks: 2
    }),

    new webpack.optimize.CommonsChunkPlugin({
      name: 'manifest',
      minChunks: Infinity
    }),
    // new BundleAnalyzerPlugin()

  ]

}
