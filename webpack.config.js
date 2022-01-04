const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");

module.exports = {
    entry: './src/index.ts',
    devtool: "inline-source-map",
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist/browser'),
        library: {
            name: "Questmark",
            type: "window"
        }
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: [{
                    loader: 'ts-loader',
                    options: {
                        configFile: "tsconfig.webpack.json"
                    }
                }],
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js"],
        fallback: { fs: false }
    },
    optimization: {
        minimize: false,
        mangleExports: false,
        minimizer: [
            new TerserPlugin({
                parallel: true,
                terserOptions: {
                    keep_classnames: true,
                    keep_fnames: true
                },
            }),
        ],
    },
    plugins: [
        new NodePolyfillPlugin()
        /*new CopyPlugin({
          patterns: [
            { from: "webRender-basic.js", to: "webRender-basic.js" }
          ],
        }),*/
    ],
};