const path = require('path');
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");
const MinimizerPlugin = require("minimizer-webpack-plugin");

module.exports = {
    mode: "production",
    entry: './src/index.ts',
    devtool: false,
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
        extensionAlias: {
            ".js": [".ts", ".js"]
        },
        fallback: { fs: false }
    },
    optimization: {
        minimize: true,
        // Tzo inspects `Function.prototype.name` at runtime, so minified
        // function names would break the VM's brace handling.
        minimizer: [new MinimizerPlugin({ minimizerOptions: { keep_fnames: true } })],
        mangleExports: false,
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