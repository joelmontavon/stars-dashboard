/*var gulp = require('gulp');

var EXPRESS_PORT = 3000;
var EXPRESS_ROOT = __dirname + '/public';
var LIVERELOAD_PORT = 35729;

// Let's make things more readable by
// encapsulating each part's setup
// in its own method
function startExpress() {

  var express = require('express');
  var app = express();
  app.use(require('connect-livereload')());
  app.use('/bower_components', express.static(__dirname + '/bower_components'));
  app.use(express.static(EXPRESS_ROOT));
  app.listen(EXPRESS_PORT);
}

// We'll need a reference to the tinylr
// object to send notifications of file changes
// further down
var lr;
function startLivereload() {

  lr = require('tiny-lr')();
  lr.listen(LIVERELOAD_PORT);
}

// Notifies livereload of changes detected
// by `gulp.watch()` 
function notifyLivereload(event) {

  // `gulp.watch()` events provide an absolute path
  // so we need to make it relative to the server root
  var fileName = require('path').relative(EXPRESS_ROOT, event.path);

  lr.changed({
    body: {
      files: [fileName]
    }
  });
}

// Default task that will be run
// when no parameter is provided
// to gulp
gulp.task('default', function () {

  startExpress();
  startLivereload();
  gulp.watch('public/*.html', notifyLivereload);
  gulp.watch('public/app/*.js', notifyLivereload);
});*/
var gulp = require('gulp');
var deploy = require('gulp-gh-pages');
var lr = require('tiny-lr')();
var express = require('express');
var app = express();

var EXPRESS_PORT = 3000;
var EXPRESS_ROOT = __dirname + '/public';
var LIVERELOAD_PORT = 35729;

gulp.task('startExpress', function () {
  app.use(require('connect-livereload')());
  app.use('/bower_components', express.static(__dirname + '/bower_components'));
  app.use(express.static(EXPRESS_ROOT));
  app.listen(EXPRESS_PORT);
});

gulp.task('startLivereload', function () {
  lr.listen(LIVERELOAD_PORT);
});

var notifyLivereload = function (event) {
  var fileName = require('path').relative(EXPRESS_ROOT, event.path);
  lr.changed({
    body: {
      files: [fileName]
    }
  });
};

gulp.task('watch', function () {
  gulp.watch('public/*.html', notifyLivereload);
  gulp.watch('public/app/*.js', notifyLivereload);
});

gulp.task('deploy', function () {
  return gulp.src("./public/**/*")
    .pipe(deploy({
      remoteUrl: 'https://github.com/joelmontavon/stars-dashboard.git',
      branch:'master'
    }))
});

gulp.task('default', ['startExpress', 'startLivereload', 'watch']);