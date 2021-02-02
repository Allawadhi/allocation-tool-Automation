
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
                
                it("Clear Button Present or Not", function(){ 
                    browser.sleep(2000);
                expect(element(by.xpath(Prospectobjects.PD.ClearButton)).isPresent()).toBe(false);
                });
                
                it("Clear Button is Clickable & only appears when filter criteria is applied", function(){ 
                    // expect(element(by.xpath(Prospectobjects.PD.ClearButton)).isPresent()).toBe(true);// ng binding works in opposite maanner
                    element(by.xpath(Prospectobjects.PD.HiringrequiredFilter)).click(); browser.sleep();
                    element(by.xpath(Prospectobjects.PD.HiringFilterNo)).click(); browser.sleep();
                    element(by.xpath(Prospectobjects.PD.ClearButton)).click();
                    });
               
 





});
