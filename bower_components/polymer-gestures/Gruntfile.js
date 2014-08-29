module.exports = function(grunt) {
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-karma');

  var sourceFiles = grunt.file.readJSON('build.json');
  var banner = grunt.file.read('banner.txt');
  var toolsPath = '../tools/';

  grunt.initConfig({
    concat: {
      polymergestures: {
        options: {
          stripBanners: true,
          banner: banner
        },
        nonull: true,
        src: sourceFiles,
        dest: 'polymergestures.dev.js'
      }
    },
    uglify: {
      polymergestures: {
        options: {
          banner: banner
        },
        nonull: true,
        dest: 'polymergestures.min.js',
        src: sourceFiles
      }
    },
    karma: {
      options: {
        configFile: 'conf/karma.conf.js',
        keepalive: true
      },
      polymergestures: {
      },
      buildbot: {
        reporters: 'crbot',
        logLevel: 'OFF'
      }
    }
  });

  grunt.loadTasks(toolsPath + 'tasks');
  grunt.registerTask('default', ['concat', 'uglify']);
  grunt.registerTask('test', ['override-chrome-launcher', 'karma:polymergestures']);
  grunt.registerTask('test-buildbot', ['override-chrome-launcher', 'karma:buildbot']);
};
