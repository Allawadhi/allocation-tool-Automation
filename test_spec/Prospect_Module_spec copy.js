
var Prospectobjects1 = require ('../pages/LocatorsDirectory.json');
var Prospectobjects = require ('../pages/ProspectTab/LocatorsProspect.json');
// var login_in=require ('../pages/login.js');
var login_in1=require ('../pages/loginPseudo.js');
var clicksubmenuitem= require('../pages/ClickSubmenuitem.js');
var prospectnew = require('../pages/CreateProspect.js');
var callingProspect = require('../pages/ProspectModulefromStart.js')
// ProspectModulefromStart

describe ("Testing the Allocation Tool -- New Prospect", function()
{
    beforeAll (function(){
    callingProspect.ProspectModulefromStart();browser.sleep(2000);
        });

// it ("Creating the Prospect using the Mandatory elements only",function(){
    
//     prospectnew.prospect('Saurabh1', 'InProgress');browser.sleep(2000); 
// });



// it ("Creating the Prospect using the Mandatory elements only With Team member",function(){
//     prospectnew.prospect1('Saurabh2', 'InProgress', 'QA' ,1);browser.sleep(2000);
// });

it ("Creating the Prospect using the Mandatory elements only With multiple Team members",function(){
    prospectnew.prospect2('Saurabh', 'InProgress', 3);browser.sleep(2000);

});

// // it ("Creating the Prospect using the Excel Sheet",function(){
// //     prospectnew.prospect3();browser.sleep(2000);

// // });

// it ("Testing the Prospect page--> Accordion should be clickable",function(){
// // user can give file name
// browser.sleep(2000);
// element(by.xpath("//li[text()=' Saurabh2 ']/../../../..")).getAttribute('style').getCssValue('height').then(function(expand){expect(expand).toBe('48px');}) ;
// browser.sleep(2000);
// element(by.xpath("//li[text()=' Saurabh2 ']/../li/span")).click();browser.sleep(2000);
// element(by.xpath("//li[text()=' Saurabh2 ']/../../../..")).getAttribute('style').getCssValue('height').then(function(expand){expect(expand).toBe('64px');}) ;browser.sleep(2000);
// });

});
