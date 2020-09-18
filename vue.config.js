const path = require("path");
const UglifyJsPlugin = require("uglifyjs-webpack-plugin"); // 混淆代码 去掉注释
const CompressionWebpackPlugin = require("compression-webpack-plugin"); // 开启压缩
const { HashedModuleIdsPlugin } = require("webpack");

// 生产环境需要压缩的文件扩展名匹配
const productionGzipExtensions = /\.(js|css|json|txt|html|ico|svg)(\?.*)?$/i;

function resolve(dir) {
  return path.join(__dirname, dir);
}

// 是否是生产环境
const isProduction = process.env.NODE_ENV === "production";

// cdn预加载使用js库
const externals = {
  vue: "window.Vue",
  "vue-router": "window.VueRouter",
  vuex: "window.Vuex",
  axios: "window.axios",
  "element-ui": "window.ELEMENT"
};

const cdn = {
  // 开发环境
  dev: {
    css: ["https://unpkg.com/element-ui/lib/theme-chalk/index.css"],
    js: []
  },
  // 生产环境
  build: {
    css: ["https://unpkg.com/element-ui/lib/theme-chalk/index.css"],
    js: [
      "https://cdn.jsdelivr.net/npm/vue@2.6.12/dist/vue.min.js",
      "https://cdn.jsdelivr.net/npm/vue-router@3.4.1/dist/vue-router.min.js",
      "https://cdn.jsdelivr.net/npm/vuex@3.5.1/dist/vuex.min.js",
      "https://cdn.jsdelivr.net/npm/axios@0.20.0/dist/axios.min.js",
      "https://unpkg.com/element-ui/lib/index.js"
    ]
  }
};

module.exports = {
  lintOnSave: true, // 打开eslint
  productionSourceMap: false,
  publicPath: "./",
  outputDir: process.env.outputDir || "dist", // 生成文件的目录名称
  chainWebpack: config => {
    config.resolve.alias.set("@", resolve("src"));
    
    // 压缩图片
    config.module
      .rule("images")
      .test(/\.(png|jpe?g|gif|svg)(\?.*)?$/)
      .use("image-webpack-loader")
      .loader("image-webpack-loader");

    // webpack 会默认给commonChunk打进chunk-vendors，所以需要对webpack的配置进行delete
    config.optimization.delete("splitChunks");

    config.plugin("html").tap(args => {
      if (process.env.NODE_ENV === "production") {
        args[0].cdn = cdn.build;
      }
      if (process.env.NODE_ENV === "development") {
        args[0].cdn = cdn.dev;
      }
      return args;
    });

    // 可视化地分析webpack打包结果
    config
      .plugin("webpack-bundle-analyzer")
      .use(require("webpack-bundle-analyzer").BundleAnalyzerPlugin);
  },

  configureWebpack: config => {
    // webpack插件
    const plugins = [];

    // 生产环境插件配置
    if (isProduction) {
      plugins.push(
        new UglifyJsPlugin({
          uglifyOptions: {
            output: {
              comments: false // 去掉注释
            },
            warnings: false,
            compress: {
              drop_console: true,
              drop_debugger: false,
              pure_funcs: ["console.log"] //移除console
            }
          }
        })
      );

      // 服务器也要相应开启gzip
      plugins.push(
        new CompressionWebpackPlugin({
          algorithm: "gzip",
          test: productionGzipExtensions, // 匹配文件名
          threshold: 10240, // 对超过10k的数据压缩
          deleteOriginalAssets: false, // 不删除源文件
          minRatio: 0.8 // 压缩比
        })
      );

      // 用于根据模块的相对路径生成 hash 作为模块 id, 一般用于生产环境
      plugins.push(new HashedModuleIdsPlugin());

      // 开启分离js
      config.optimization = {
        runtimeChunk: "single",
        splitChunks: {
          chunks: "all",
          maxInitialRequests: Infinity,
          minSize: 1000 * 60,
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name(module) {
                // 排除node_modules 然后吧 @ 替换为空 ,考虑到服务器的兼容
                const packageName = module.context.match(
                  /[\\/]node_modules[\\/](.*?)([\\/]|$)/
                )[1];
                return `npm.${packageName.replace("@", "")}`;
              }
            }
          }
        }
      };

      // 取消webpack警告的性能提示
      config.performance = {
        hints: "warning",
        //入口起点的最大体积
        maxEntrypointSize: 1000 * 500,
        //生成文件的最大体积
        maxAssetSize: 1000 * 1000,
        //只给出 js 文件的性能提示
        assetFilter: function(assetFilename) {
          return assetFilename.endsWith(".js");
        }
      };

      // 打包时npm包转CDN
      config.externals = externals;
    }

    return { plugins };
  },

  css: {
    // 是否将组件中的 CSS 提取至一个独立的 CSS 文件中 (而不是动态注入到 JavaScript 中的 inline 代码)
    extract: true,
    sourceMap: false
  },

  pluginOptions: {
    // 配置全局scss
    "style-resources-loader": {
      preProcessor: "scss",
      patterns: [resolve("./src/style/theme.scss")]
    }
  },
  devServer: {
    // open: true, // 自动启动浏览器
    host: "localhost", // localhost
    port: 8085 // 端口号
    // https: false,
    // hotOnly: false // 热更新
    // proxy: {
    //   "^/sso": {
    //     target: process.env.VUE_APP_SSO, // 重写路径
    //     ws: true, //开启WebSocket
    //     secure: false, // 如果是https接口，需要配置这个参数
    //     changeOrigin: true
    //   }
    // }
  }
};
