
// const  HtmlReporter = require('');

const  HtmlReporter = require('protractor-beautiful-reporter');
const  HTMLReport = require ('protractor-html-reporter-2');
const  jasmineReporters = require ('jasmine-reporters');
let VideoReporter = require('protractor-video-reporter');
// let VideoReporter = require('.//..//..//Automation/test_spec/Prospect_Module_spec');
exports.config =
{

directConnect: true, framework: 'jasmine2',
// multiCapabilities: [
//   {'browserName': 'chrome'} ,
//   {'browserName': 'firefox'}
// ],

// suites: {
    // LoginSaurabh: ['..//test_spec/LoginTestsaurabh_spec.js'],
//     //  Prospect: ['.//..//..//Automation/test_spec/Prospect_Module_spec copy.js','.//..//..//Automation/test_spec/Prospect_Module_spec.js'],
//     //  PeopleDir: ['..//test_spec/PD_Module_spec.js']
//   },

  //  specs: ['..//test_spec/LoginTestsaurabh_spec.js'],
  //  specs: ['.//..//..//Automation/test_spec/Prospect_Module_spec copy.js'],
//specs: ['.//..//..//Automation/test_spec/Prospect_Module_spec.js'],
//specs: ['..//test_spec/PD_Module_spec.js'],

// specs: ['..//test_spec/ProspectModule/Filtersprospect_spec.js'],

specs: ['..//test_spec/LoginTestsaurabh_spec.js'],

jasmineNodeOpts: {
    showColors: true,
    defaultTimeoutInterval: 90000
}
,
// onPrepare: async () => {
//   await browser.waitForAngularEnabled(false);
  
// },
onPrepare: function() {
   // video reporter 
  //  VideoReporter.prototype.jasmineStarted = function () {
  //   let self = this;
  //   if (self.options.singleVideo) {
  //       let videoPath = path.join(self.options.baseDirectory,
  //           'protractor-specs.avi');
  //       self._startScreencast(videoPath);
  //       if (self.options.createSubtitles) {
  //           self._subtitles = [];
  //           self._jasmineStartTime = new Date();
  //       }
  //   }
  // };
  
  
  
  //Allure report
    var AllureReporter = require('jasmine-allure-reporter');
    jasmine.getEnv().addReporter(new AllureReporter({
      resultsDir: 'allure-results'
    }));

    
    jasmine.getEnv().afterEach(function(done){
      browser.takeScreenshot().then(function (png) {
        allure.createAttachment('Screenshot', function () {
          return new Buffer(png, 'base64')
        }, 'image/png')();
        done();
      })
    });

     // Add a screenshot reporter and store screenshots to `/tmp/screenshots`:
     jasmine.getEnv().addReporter(new HtmlReporter({
        baseDirectory: 'tmp/screenshots'
     }).getJasmine2Reporter());


// // Protractor HTML reporter 2
// var jasmineReporters = require('jasmine-reporters');
// jasmine.getEnv().addReporter(new jasmineReporters.JUnitXmlReporter({
//     consolidateAll: true,
//     savePath: './',
//     filePrefix: 'xmlresults'
// }));

   }
  , 
  
//   plugins: [{
//     package: 'jasmine2-protractor-utils',
//     disableHTMLReport: true,
//     disableScreenshot: false,
//     screenshotPath:'./screenshots',
//     screenshotOnExpectFailure:false,
//     screenshotOnSpecFailure:true,
//     clearFoldersBeforeTest: true
  
// }],

  //HTMLReport called once tests are finished
// onComplete: function() {
//     var browserName, browserVersion;
//     var capsPromise = browser.getCapabilities();

//     capsPromise.then(function (caps) {
//        browserName = caps.get('browserName');
//        browserVersion = caps.get('version');
//        platform = caps.get('platform');

//        var HTMLReport = require('protractor-html-reporter-2');

//        testConfig = {
//            reportTitle: 'Protractor Test Execution Report',
//            outputPath: './',
//            outputFilename: 'ProtractorTestReport',
//            screenshotPath: './screenshots',
//            testBrowser: browserName,
//            browserVersion: browserVersion,
//            modifiedSuiteName: false,
//            screenshotsOnlyOnFailure: true,
//            testPlatform: platform
//        };
//        new HTMLReport().from('xmlresults.xml', testConfig);
//    });
// }



// onComplete:function () {
//     console.log("Sending Mail with reports for the test execution.");
//     var sys = require('util')
//     var exec = require('child_process').exec;
//     function puts(error, stdout, stderr) { sys.puts(stdout) }
//     exec("node mail.js", puts);
// }


    



};
