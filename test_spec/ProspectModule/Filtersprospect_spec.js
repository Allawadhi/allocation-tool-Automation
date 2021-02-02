

 var Prospectobjects = require ('.../pages/ProspectTab/LocatorsProspect.json');
// var login_in=require ('../pages/login.js');
 var login_in1=require ('../pages/loginPseudo.js');
 var clicksubmenuitem= require('../pages/ClickSubmenuitem.js');
 var prospectnew = require('../pages/CreateProspect.js');
describe ("Testing the Allocation Tool -- New Prospect", function()
{ beforeEach (function(){
    browser.waitForAngularEnabled(false);
   // browser.get('http://qa.zeppl.in/'); 
   browser.get('http://dev.zeppl.in/'); 
    browser.manage().window().maximize();
    
    login_in1.loginasPseudoquant();
     browser.sleep(2000);
     browser.getTitle().then(function(titles){expect(titles).toBe("Zepplin"); });
     clicksubmenuitem.clicksubmenu();browser.sleep(2000); browser.refresh();

     browser.sleep(2000);
}
);



    xit (" Checking the project filter is editable", function(){
        element(by.xpath(Prospectobjects.PD.ProjectFilter)).sendKeys(Prospectobjects.PD.Projectname);
        browser.sleep(2000);
    });

    xit (" Checking the Status filter is clickable", function(){
        element(by.xpath(Prospectobjects.PD.StatusFilter)).click();
        browser.sleep(2000);
    });

    xit (" Calculate number of values of Status Filter with their names", function(){
        element(by.xpath(Prospectobjects.PD.StatusFilter)).click();
        element.all(by.xpath(Prospectobjects.PD.StatusFiltercount)).count().then(function (statusfiltercount){
        console.log("The number of status filter are --> "+statusfiltercount);
            
        browser.sleep(2000);
    });
});
fit (" Test", function(){
    console.log("Test");
        
    browser.sleep(2000);
});





});









