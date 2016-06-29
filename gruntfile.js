
// TODO: automatically compile lispy and commit iff it compiles

module.exports = function(grunt) {

    grunt.loadNpmTasks('grunt-screeps');

    grunt.initConfig({
        screeps: {
            options: {
                email: 'surprisetalk@gmail.com',
                password: 'Wh0rus11',
                branch: 'default',
                ptr: false
            },
            dist: {
                src: ['dist/main.js']
            }
        }
    });
};
