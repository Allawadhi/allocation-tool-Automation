var loginobjects = require ('..//pages/LocatorsDirectory.json');

var Loginin = function (){

   this.loginasSaurabh=function(){
   
   element (by.buttonText(loginobjects.LoginintoZepplin.LoginButton)).click();  
   browser.manage().timeouts().implicitlyWait(5000);
    element(by.id(loginobjects.LoginintoZepplin.username)).sendKeys(loginobjects.LoginintoZepplin.usernamevalue);
    
    element(by.xpath(loginobjects.LoginintoZepplin.nextButton)).click();
    browser.manage().timeouts().implicitlyWait(5000);browser.sleep(2000);
    element(by.name(loginobjects.LoginintoZepplin.password)).sendKeys(loginobjects.LoginintoZepplin.passwordvalue);
    browser.sleep(2000); 
    element(by.xpath(loginobjects.LoginintoZepplin.nextButton)).click();
   
    console.log('Login Done');  
   };    
};
module.exports=new Loginin();