const path = require("path");
// const CopyWebpackPlugin = require("copy-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const config = {
  // absolute path for project root
  context: path.resolve(__dirname, "client"),

  entry: {
    // relative path declaration
    app: "./app.js",
  },
  // devtool: "source-map",

  output: {
    filename: "bundle.[contenthash].js",
    path: path.resolve(__dirname, "public"),
  },

  plugins: [
    new MiniCssExtractPlugin(),
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      template: "index.html",
    }),
  ],

  module: {
    rules: [
      // babel-loader with 'env' preset
      {
        test: /\.js$/,
        include: /client/,
        exclude: /node_modules/,
        use: { loader: "babel-loader", options: { presets: ["@babel/env"] } },
      },
      // html-loader
      {
        test: /\.html$/,
        use: ["html-loader"],
      },
      // CSS
      {
        test: /\.s[ac]ss$/i,
        use: [
          "style-loader",
          {
            loader: "css-loader",
            options: {
              sourceMap: true,
            },
          },
          {
            loader: "sass-loader",
            options: {
              sourceMap: true,
            },
          },
        ],
      },
    ],
  },

  devServer: {
    // static files served from here
    contentBase: path.resolve(__dirname, "./public/assets/media"),
    compress: true,
    // open app in localhost:8000
    port: 8000,
    stats: "errors-only",
    open: true,
  },

  cache: true,
};

module.exports = config;
