
var Prospectobjects1 = require ('../pages/LocatorsDirectory.json');
var Prospectobjects = require ('../pages/ProspectTab/LocatorsProspect.json');
// var login_in=require ('../pages/login.js');
var login_in1=require ('../pages/loginPseudo.js');
var clicksubmenuitem= require('../pages/ClickSubmenuitem.js');
var prospectnew = require('../pages/CreateProspect.js');
var callingProspect = require('../pages/ProspectModulefromStart.js')
// ProspectModulefromStart


describe ("Search Button", function(){
    beforeAll (function(){
    callingProspect.ProspectModulefromStart();browser.sleep(2000);
    // clicksubmenuitem.clicksubmenu();browser.sleep(2000); browser.refresh();
    //    browser.sleep(2000);    
});
                    
        it("Disable State", function(){ 
        expect(element(by.xpath(Prospectobjects.PD.SearchButton)).isPresent()).toBe(true);});
                    
        // Enable State & Button is clickable is checked by next case
         it("Hover Color Change", function(){ 
        //Button color when it is disable
        element(by.xpath(Prospectobjects.PD.SearchButton)).getAttribute('style').getCssValue('background-image').then(function(expand){console.log(expand);}) 
         browser.sleep(2000);
        browser.actions().mouseMove(element(by.xpath(Prospectobjects.PD.SearchButton))).perform();
        browser.manage().timeouts().implicitlyWait(5000);
        element(by.xpath(Prospectobjects.PD.SearchButton)).getAttribute('style').getCssValue('background-image').then(function(expand){console.log(expand);})
                   
        // Button color when it is enable
        //Selecting the Hiring Required values No
        element(by.xpath(Prospectobjects.PD.HiringrequiredFilter)).click(); browser.sleep();
        element(by.xpath(Prospectobjects.PD.HiringFilterNo)).click(); browser.manage().timeouts().implicitlyWait(5000);
        element(by.xpath(Prospectobjects.PD.SearchButtonText)).getAttribute('style').getCssValue('background-image').then(function(expand){console.log(expand);})
        browser.sleep(2000);
        browser.actions().mouseMove(element(by.xpath(Prospectobjects.PD.SearchButtonText))).perform();
         browser.manage().timeouts().implicitlyWait(5000);
        element(by.xpath(Prospectobjects.PD.SearchButtonText)).getAttribute('style').getCssValue('background-image').then(function(expand){console.log(expand);})
     browser.sleep(2000);    
    });
          
        
        




});
