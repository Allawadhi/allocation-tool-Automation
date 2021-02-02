var tabobjects = require ('..//pages/LocatorsDirectory.json');

var click_tabelem = function (){

   this.clicktabelements=function(itemname){


browser.sleep(2000);

  switch (itemname){
   case 'PeopleDirectory' :
    element(by.xpath(tabobjects.AllocationModule.PD.PDTab)).click();    
     break;
   
     case 'Prospect' :
      element(by.xpath(tabobjects.AllocationModule.Prospect.ProspectTab)).click();
         break;

        case 'Hiring':
         element(by.xpath(tabobjects.AllocationModule.Hiring.HiringTab)).click();
           break;

   
   }


};
};


module.exports=new click_tabelem();