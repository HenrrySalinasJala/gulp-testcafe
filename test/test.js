var expect         = require('chai').expect;
var vinylFile      = require('vinyl-file');
var promisifyEvent = require('promisify-event');
var gulpTestCafe   = require('../');

function createReportOutStream () {
    return {
        data: '',

        write: function (text) {
            this.data += text;
        },

        end: function () {
        }
    };
}

it('Should run tests', function () {
    var reportStream = createReportOutStream();

    var ps = gulpTestCafe({
        browsers: ['chrome', 'firefox'],
        reporter: { output: reportStream }
    });


    var resultsPromise = Promise.race([
        promisifyEvent(ps, 'error'),

        promisifyEvent(ps, 'done').then(function () {
            expect(reportStream.data).contains('Chrome');
            expect(reportStream.data).contains('Firefox');
            expect(reportStream.data).contains('3 passed');
        })
    ]);

    ps.write(vinylFile.readSync('test/fixtures/passing1.js'));
    ps.write(vinylFile.readSync('test/fixtures/passing2.js'));
    ps.end();

    return resultsPromise;
});

it('Should fail if tests fail', function () {
    var reportStream = createReportOutStream();

    var ps = gulpTestCafe({
        browsers: ['chrome'],
        reporter: { output: reportStream }
    });

    var resultsPromise = Promise.race([
        promisifyEvent(ps, 'error').catch(function (err) {
            expect(err.message).eql('2 test(s) failed.');
            expect(reportStream.data).contains('Chrome');
            expect(reportStream.data).contains('2/4 failed');
        }),

        promisifyEvent(ps, 'done').then(function () {
            throw new Error('Error expected');
        })
    ]);

    ps.write(vinylFile.readSync('test/fixtures/passing1.js'));
    ps.write(vinylFile.readSync('test/fixtures/failing.js'));
    ps.end();

    return resultsPromise;
});

it('Should fail if configuration is incorrect', function () {
    var reportStream = createReportOutStream();

    var ps = gulpTestCafe({
        browsers: ['chrome'],
        reporter: { name: 'unknown', output: reportStream },
    });

    var resultsPromise = Promise.race([
        promisifyEvent(ps, 'error').catch(function (err) {
            expect(err.message).eql('The provided "unknown" reporter does not exist. Check that you have specified the report format correctly.');
            expect(reportStream.data).eql('');
        }),

        promisifyEvent(ps, 'done').then(function () {
            throw new Error('Error expected');
        })
    ]);

    ps.write(vinylFile.readSync('test/fixtures/passing1.js'));
    ps.end();

    return resultsPromise;
});

it('Should use multiple reporters', function () {
    var reportStream1 = createReportOutStream();
    var reportStream2 = createReportOutStream();

    var ps = gulpTestCafe({
        browsers: ['chrome', 'firefox'],
        reporter: [{ output: reportStream1 }, { name: 'json', output: reportStream2 }]
    });

    var resultsPromise = Promise.race([
        promisifyEvent(ps, 'error'),

        promisifyEvent(ps, 'done').then(function () {
            expect(reportStream1.data).contains('Chrome');
            expect(reportStream1.data).contains('Firefox');
            expect(reportStream1.data).contains('3 passed');

            expect(reportStream2.data).contains('Chrome');
            expect(reportStream2.data).contains('Firefox');
            expect(reportStream2.data).contains('"passed": 3');
        })
    ]);

    ps.write(vinylFile.readSync('test/fixtures/passing1.js'));
    ps.write(vinylFile.readSync('test/fixtures/passing2.js'));
    ps.end();

    return resultsPromise;
});
