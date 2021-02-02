
let Prospectobjects1 = require ('../../pages/LocatorsDirectory.json');
let Prospectobjects = require ('../../pages/ProspectTab/LocatorsProspect.json');
// var login_in=require ('../pages/login.js');
let login_in1=require ('../../pages/loginPseudo.js');
let clicksubmenuitem= require('../../pages/ClickSubmenuitem.js');
let prospectnew = require('../../pages/CreateProspect.js');
let callingProspect = require('../../pages/ProspectModulefromStart.js')
let clicktabs2 = require('../../pages/ClickTabs.js');
// ProspectModulefromStart

describe("Filters",function(){
    beforeAll (function(){
    callingProspect.ProspectModulefromStart();browser.sleep(2000);
        });



        it (" Checking the project filter is editable", function(){
        element(by.xpath(Prospectobjects.PD.ProjectFilter)).sendKeys(Prospectobjects.PD.Projectname);
        browser.refresh(); browser.sleep(2000);
        console.log("1");
    });

        // browser.refresh(); browser.sleep(2000);
        it (" Checking the Status filter is clickable", function(){
        element(by.xpath(Prospectobjects.PD.StatusFilter)).click();
          browser.refresh(); browser.sleep(2000);console.log("2");
    });

       
        it (" Calculate number of values of Status Filter ", function(){
        element(by.xpath(Prospectobjects.PD.StatusFilter)).click();
        element.all(by.xpath(Prospectobjects.PD.StatusFiltercount)).count().then(function (statusfiltercount){
        console.log("The number of status filter are --> "+statusfiltercount);
        browser.refresh(); browser.sleep(2000);
        console.log("3");
         });  
});

        it (" Checking the  Group filter is clickable", function(){
    element(by.xpath(Prospectobjects.PD.GroupFilter)).click();
    browser.refresh(); browser.sleep(2000);
    console.log("4");
});

        it (" Calculate number of values of group Filter ", function(){
    element(by.xpath(Prospectobjects.PD.GroupFilter)).click(); browser.sleep(2000);
    element.all(by.xpath(Prospectobjects.PD.GroupFiltercount)).count().then(function (groupfiltercount){
    console.log("The number of group filter are --> "+groupfiltercount);})
        
    browser.refresh(); browser.sleep(2000);console.log("5");
});

        it (" Checking the  hiring status is clickable", function(){
    element(by.xpath(Prospectobjects.PD.HiringStatusFilter)).click();
    browser.refresh(); browser.sleep(2000);console.log("6");
});

        it (" Calculate number of values of hiring status Filter ", function(){
    element(by.xpath(Prospectobjects.PD.HiringStatusFilter)).click(); browser.sleep(2000);
    element.all(by.xpath(Prospectobjects.PD.HiringStatuscount)).count().then(function (hiringstatuscount){
    console.log("The number of group filter are --> "+hiringstatuscount);
    expect(hiringstatuscount).toBe(8);})
    browser.refresh(); browser.sleep(2000);console.log("7");
 });  

        it (" Checking the  hiring required is clickable", function(){
    element(by.xpath(Prospectobjects.PD.HiringrequiredFilter)).click();
    browser.refresh(); browser.sleep(2000);console.log("8");
});

        it (" Calculate number of values of hiring status Filter ", function(){
    element(by.xpath(Prospectobjects.PD.HiringrequiredFilter)).click(); browser.sleep(2000);
    element.all(by.xpath(Prospectobjects.PD.Hiringrequiredcount)).count().then(function (hiringreqcount){
    console.log("The number of hiring status Filter are --> "+hiringreqcount);
    expect(hiringreqcount).toBe(2);})
    browser.refresh(); browser.sleep(2000);console.log("9"); });  


    

});
