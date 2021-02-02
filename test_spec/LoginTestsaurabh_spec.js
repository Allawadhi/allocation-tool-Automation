let login_in=require ('..//pages/login.js');
let urlofdefaultpage = ('..//pages/URL.js');

describe ("Login in Zepplin Test", function()
{ it ("Login as Saurabh", function(){
    browser.waitForAngularEnabled(false);
    // browser.get('http://qa.zeppl.in/'); 
    browser.get('http://dev.zeppl.in/'); 
    browser.manage().window().maximize();
    login_in.loginasSaurabh();
    browser.sleep(5000);
  browser.getTitle().then(function(titles){expect(titles).toBe("Zepplin"); });  
  browser.getCurrentUrl().then(function(urls){console.log(urls); });
  browser.sleep(5000);
  console.log('Welcome Saurabh');
  // browser.close();
});
// afterEach(() => {
//   browser.close(); 
//  console.log('afterEach');
// });
});



