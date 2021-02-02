
// var loggers = require('..//CONF/log.js');

// var login_in=require ('../pages/login.js');
var Prospectobjects4 = require ('../pages/ScreenResolution.js');
var Prospectobjects2 = require ('../pages/LocatorsDirectory.json');
var Prospectobjects3 = require ('../pages/NewprojectQuant.js');
var login_in1=require ('../pages/loginPseudo.js');
var clicksubmenuitem= require('../pages/ClickSubmenuitem.js');
var prospectnew = require('../pages/CreateProspect.js');
var clicktabs = require('..//pages/ClickTabs.js');
var switchwindows= require('..//pages/WindowHandling.js');
var URL= require('..//pages/URL.js');
var callingProspect = require('../pages/ProspectModulefromStart.js')
describe ("Testing the Allocation Tool -- People Directory", function()

{beforeAll (function(){
    // callingProspect.ProspectModulefromStart();browser.sleep(2000);
    clicktabs.clicktabelements('PeopleDirectory');}
 );



it ("Adding Project to the Quant",function(){
    element(by.xpath(Prospectobjects2.AllocationModule.PD.QuantsManager)).click();
    Prospectobjects3.NewprojectQuants('Zepplin','75','Yes', 'Dec 12, 2020', 'Dec 31, 2020');
    
    browser.sleep(5000);

});


// xit ('Checking the Resolution for filter module',function(){
//     browser.sleep(3000);
//     Prospectobjects4.ScreenResolution(1280, 480);
//     browser.sleep(3000);
//     element(by.xpath("//div [@class='data-filters-container']")).getAttribute('style').getCssValue('width').then(function(expand){console.log(expand);}) ;
//     // element(by.xpath("//header [@class='new-prospect ng-star-inserted']")).getAttribute('style').getCssValue('width').then(function(expand){console.log(expand);}) ;
    
//     Prospectobjects4.ScreenResolution(1380, 480);
//     browser.sleep(3000);
//     element(by.xpath("//div [@class='data-filters-container']")).getAttribute('style').getCssValue('width').then(function(expand){console.log(expand);}) ;
//     // element(by.xpath("//header [@class='new-prospect ng-star-inserted']")).getAttribute('style').getCssValue('width').then(function(expand){console.log(expand);}) ;

//     Prospectobjects4.ScreenResolution(1480, 480);
//     browser.sleep(3000);
//     element(by.xpath("//div [@class='data-filters-container']")).getAttribute('style').getCssValue('width').then(function(expand){console.log(expand);}) ;
//     // element(by.xpath("//header [@class='new-prospect ng-star-inserted']")).getAttribute('style').getCssValue('width').then(function(expand){console.log(expand);}) ;

//     Prospectobjects4.ScreenResolution(1680, 480);
//     browser.sleep(3000);
//     element(by.xpath("//div [@class='data-filters-container']")).getAttribute('style').getCssValue('width').then(function(expand){console.log(expand);}) ;
//     // element(by.xpath("//header [@class='new-prospect ng-star-inserted']")).getAttribute('style').getCssValue('width').then(function(expand){console.log(expand);}) ;
    

// });

    it ('Checking the Resolution of the page for Filter Area ',function(){
        Prospectobjects4.ScreenResolutionPage();
    });

    it ("Testing the People Directory--> profile page shall open in a new when clicked on QUAnt name",function(){
        // logger.log('info','Testing the PD');
        
    
        element(by.xpath(Prospectobjects2.AllocationModule.PD.QuantsName )).click();
        switchwindows.windowhandlesclick();
    
    });
});



