const { src, dest, series, parallel, watch } = require('gulp');

// 自动加载插件
const loadPlugins = require('gulp-load-plugins');
const plugins = loadPlugins();

const del = require('del');

const browserSync = require('browser-sync');

// process.cwd() 方法返回 Node.js 进程的当前工作目录
const cwd = process.cwd()
let config = {
    // * default config
    build: {
        src: 'src',
        dist: 'dist',
        temp: 'temp',
        public: 'public',
        paths: {
            styles: 'assets/styles/*.scss',
            scripts: 'assets/scripts/*.js',
            pages: '*.html',
            images: 'assets/images/**',
            fonts: 'assets/fonts/**'
        }
    }
}
try {
    const loadConfig = require(`${cwd}/pages.config.js`)
    // 如果有默认配置
    config = Object.assign({}, config, loadConfig)
} catch (e) { }

const style = () => {
    return src(config.build.paths.styles, { base: config.build.src, cwd: config.build.src })
        .pipe((plugins.sass(require('sass')))({ outputStyle: 'expanded' }))
        .pipe(dest(config.build.temp))
}

const script = () => {
    return src(config.build.paths.scripts, { base: config.build.src, cwd: config.build.src })
        .pipe(plugins.babel({ presets: [require('@babel/preset-env')] }))
        .pipe(dest(config.build.temp));
}

const page = () => {
    return src(config.build.paths.pages, { base: config.build.src, cwd: config.build.src })
        .pipe(plugins.swig({
            defaults: {
                cache: false
            },
            data: config.data
        }))
        .pipe(dest(config.build.temp));
}

const imgae = () => {
    return src(config.build.paths.images, { base: config.build.src, cwd: config.build.src })
        .pipe(plugins.imagemin())
        .pipe(dest(config.build.dist));
}

const font = () => {
    return src(config.build.paths.fonts, { base: config.build.src, cwd: config.build.src }).
        pipe(plugins.imagemin()).
        pipe(dest(config.build.dist));
}

const extra = () => {
    return src('**', { base: config.build.public, cwd: config.build.public }).
        pipe(dest(config.build.dist))
}

// 引用文件处理
const useref = () => {
    return src(config.build.paths.pages, { base: config.build.temp, cwd: config.build.temp })
        .pipe(plugins.useref({ searchPath: [config.build.temp, '.'] }))
        .pipe(plugins.if(/\.js$/, plugins.uglify()))
        .pipe(plugins.if(/\.css$/, plugins.cleanCss()))
        .pipe(plugins.if(/\.html$/, plugins.htmlmin(
            {
                collapseWhitespace: true,
                minifyCSS: true,
                minifyJS: true
            }
        )))
        .pipe(dest(config.build.dist));
}

// 开发服务器
const bs = browserSync.create();
const serve = () => {

    watch(config.build.paths.styles, { cwd: config.build.src }, style);
    watch(config.build.paths.scripts, { cwd: config.build.src }, script);
    watch(config.build.paths.pages, { cwd: config.build.src }, page);

    /**
       * !开发阶段当这三个文件发生变化时，
       * !调用browser-sync模块提供的 reload 方法重新载入一下就行，不需要去执行构建
       * */
    watch(
        [config.build.paths.images, config.build.paths.fonts],
        { cwd: config.build.src },
        bs.reload
    );
    watch('**', { cwd: config.build.public }, bs.reload);

    bs.init({
        notify: false,
        port: 8080,
        files: config.build.temp + '/**',
        server: {
            baseDir: [config.build.temp, config.build.src, config.build.public],
            routes: {
                '/node_modules': 'node_modules'
            }
        }
    })
}


// 文件清除
const clean = () => {
    // ! del() 返回一个Promiss对象
    return del([config.build.dist, config.build.temp])
}

const compile = parallel(style, script, page)

// * 上线前构建任务
// !注意构建顺序：先清理文件再执行编译
const build = series(clean, parallel(series(compile, useref), imgae, font, extra));

// * 开发时的构建任务, 调试
const develop = series(clean, compile, serve)

module.exports = {
    clean,
    develop,
    build
}