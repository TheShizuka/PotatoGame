const path = require('path');

module.exports = {
  entry: './src/index.js',  // Your source directory and entry file
  output: {
    filename: 'bundle.js',  // The output file name
    path: path.resolve(__dirname, 'public'),  // Output directory
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],  // Loaders for CSS files
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']  // Preset for modern JavaScript
          }
        }
      }
    ]
  },
  externals: {
    'matter-js': 'Matter'
  }
};
