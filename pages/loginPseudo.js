var loginPseudoquant = function (){

   this.loginasPseudoquant=function(){
    element (by.buttonText('Login to Explore Zepplin')).click();  
    browser.sleep(2000);
    element(by.id('identifierId')).sendKeys('zepplin-dev@quovantis.com');
    browser.sleep(2000);
    element(by.xpath("//span[text()='Next']/..")).click();
    browser.sleep(2000);
    element(by.name('password')).sendKeys('Quo#4321');
    browser.sleep(2000);
    element(by.xpath("//span[text()='Next']/..")).click();
    browser.sleep(10000);
    // element(by.xpath("//div[text()='Standard rates apply'] //..//..//..")).click();
    // browser.sleep(15000);
    console.log('Login Done');  
   };
};
module.exports=new loginPseudoquant();