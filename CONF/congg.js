// let PS = require('.//');
exports.config =
{

directConnect: true, framework: 'jasmine2',
specs: [''],
capabilities: {
  'browserName': 'chrome',
	  // 'shardTestFiles': true,
    //   'maxInstances': 2


  //  chromeOptions: {
  //     args: [ "--headless", "--disable-gpu", "--window-size=800,600" ]
  //  }
}
,


jasmineNodeOpts: {
    showColors: true,
  defaultTimeoutInterval: 2147483646
}
,
onPrepare: async () => {
  await browser.waitForAngularEnabled(false);
    
  },
  
};
