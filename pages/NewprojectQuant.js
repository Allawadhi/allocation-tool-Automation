
var ProspectDate = require ('../pages/PickaDate.js');
var Prospectobjects2 = require ('../pages/LocatorsDirectory.json');
var Prospectobjects = require ('../pages/ProspectTab/LocatorsProspect.json');
// var login_in=require ('../pages/login.js');
var login_in1=require ('../pages/loginPseudo.js');
var clicksubmenuitem= require('../pages/ClickSubmenuitem.js');
var prospectnew = require('../pages/CreateProspect.js');

var NewprojectQuant = function (){

     this.NewprojectQuants=function(ProjectnameUser,ProejctallocationUser, BillingStatusUser, AllocationStartDate, AllocationTilltDate) {
        
        //giving project name
        element(by.xpath(Prospectobjects2.AllocationModule.PD.ProjectBox)).clear();
        // element(by.xpath(Prospectobjects2.AllocationModule.PD.ProjectBox)).sendKeys(Prospectobjects2.AllocationModule.PD.ProjectName);
        element(by.xpath(Prospectobjects2.AllocationModule.PD.ProjectBox)).sendKeys(ProjectnameUser);
        element(by.xpath(Prospectobjects2.AllocationModule.PD.ProjectPopup)).click();
        
        //giving % of allocation
        switch (ProejctallocationUser){
            case '25' :
               break;
           
             case '50' :
               break;
        
             case '75':
                element(by.xpath(Prospectobjects2.AllocationModule.PD.ProjectAllocation)).click();
                element(by.xpath(Prospectobjects2.AllocationModule.PD.ProjectAllocationvalue)).click();              
             break;
             case '100' :
               break;
                    
             default: console.log("Incorrect ALLOCATION added");
      
        }
   

 //giving billing status -no
switch (BillingStatusUser){
    case 'Yes' :
        element(by.xpath(Prospectobjects2.AllocationModule.PD.ProjectBilling)).click();
        element(by.xpath(Prospectobjects2.AllocationModule.PD.ProjectBillingvalue)).click();             
       break;
     case 'No':
         break;
     case '100' :
       break;
            
     default: console.log("Incorrect ALLOCATION added");

}

    
    //giving Allocation Start Date
    element(by.xpath(Prospectobjects2.AllocationModule.PD.AllocationStartDate)).clear();
    element(by.xpath(Prospectobjects2.AllocationModule.PD.AllocationStartDate)).sendKeys(AllocationStartDate);
    
    //giving Allocation Start Date
    browser.sleep(2000);
    element(by.xpath(Prospectobjects2.AllocationModule.PD.AllocationtillDate)).click();
    ProspectDate.PickaDate1(AllocationTilltDate);

    browser.navigate().back();

    browser.sleep(5000);
    

};};



module.exports=new NewprojectQuant();