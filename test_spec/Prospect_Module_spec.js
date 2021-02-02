
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
        clicksubmenuitem.clicksubmenu();browser.sleep(2000); browser.refresh();
     browser.sleep(2000);
    // callingProspect.ProspectModulefromStart();browser.sleep(2000);
        });
// it ("Creating the Prospect using the Mandatory elements only",function(){
    
//     prospectnew.prospect('Saurabh1', 'InProgress');browser.sleep(2000); 
// });



// it ("Creating the Prospect using the Mandatory elements only With Team member",function(){
//     prospectnew.prospect1('Saurabh2', 'InProgress', 'QA' ,1);browser.sleep(2000);
// });

// it ("Creating the Prospect using the Mandatory elements only With multiple Team members",function(){
//     prospectnew.prospect2('Saurabh', 'InProgress', 2);browser.sleep(2000);

// });

// // it ("Creating the Prospect using the Excel Sheet",function(){
// //     prospectnew.prospect3();browser.sleep(2000);

// // });

// it ("Testing the Prospect page--> Accordion should be clickable",function(){
// // user can give file name
// browser.sleep(2000);
// element(by.xpath("//li[text()=' Saurabh ']/../../../..")).getAttribute('style').getCssValue('height').then(function(expand){expect(expand).toBe('48px');}) ;
// browser.sleep(2000);
// element(by.xpath("//li[text()=' Saurabh ']/../li/span")).click();browser.sleep(2000);
// element(by.xpath("//li[text()=' Saurabh ']/../../../..")).getAttribute('style').getCssValue('height').then(function(expand){expect(expand).toBe('64px');}) ;browser.sleep(2000);
// });









//*******************************FILTERS **************************************/
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



//*******************************SEARCH BUTTON **************************************/


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
//*******************************CLEAR BUTTON**************************************/

it("Clear Button Present or Not", function(){ 
    browser.refresh(); browser.sleep(2000);
expect(element(by.xpath(Prospectobjects.PD.ClearButton)).isPresent()).toBe(false);
});

it("Clear Button is Clickable & only appears when filter criteria is applied", function(){ 
    // expect(element(by.xpath(Prospectobjects.PD.ClearButton)).isPresent()).toBe(true);// ng binding works in opposite maanner
    browser.refresh(); browser.sleep(2000);
    element(by.xpath(Prospectobjects.PD.HiringrequiredFilter)).click(); browser.sleep();
    element(by.xpath(Prospectobjects.PD.HiringFilterNo)).click(); browser.sleep();
    element(by.xpath(Prospectobjects.PD.ClearButton)).click();
    });




});
