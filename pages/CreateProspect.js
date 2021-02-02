
// var prospectbyexcel = require ('./ReadbyExcel.js');
var prospectcreateinputs = require ('../pages/ProspectTab/LocatorsProspect.json');
var createprospects = function (){
var projectnameuser, statusname;
    this.prospect=function(projectnameuser, statusnameuser){

     element(by.buttonText(prospectcreateinputs.NewProspectCreate.AddProspectButton)).click();browser.sleep(2000);
     element(by.name(prospectcreateinputs.NewProspectCreate.ProjectName)).sendKeys (projectnameuser);browser.sleep(2000);
     
     switch (statusnameuser){
         case 'OnHold' :
            element(by.xpath(prospectcreateinputs.NewProspectCreate.StatusName)).click();browser.sleep(2000);
            element(by.xpath(prospectcreateinputs.NewProspectCreate.StatusOnHold)).click();
          break;
        
          case 'InProgress' :
            element(by.xpath(prospectcreateinputs.NewProspectCreate.StatusName)).click();browser.sleep(2000);
            element(by.xpath(prospectcreateinputs.NewProspectCreate.StatusInProgress)).click();  
            break;
     
          case 'Closed':
                element(by.xpath(prospectcreateinputs.NewProspectCreate.StatusName)).click();browser.sleep(2000);
                element(by.xpath(prospectcreateinputs.NewProspectCreate.StatusClosed)).click();  
                 break;
                 
          default: console.log("Incorrect status added");
   
     }

   element(by.buttonText(prospectcreateinputs.NewProspectCreate.SaveButton)).click();browser.sleep(2000);
     browser.sleep(2000);  


  
 
 };


 this.prospect1=function(projectnameuser, statusnameuser,rolenameuser, countmember ){

    element(by.buttonText(prospectcreateinputs.NewProspectCreate.AddProspectButton)).click();browser.sleep(2000);
    element(by.name(prospectcreateinputs.NewProspectCreate.ProjectName)).sendKeys (projectnameuser);browser.sleep(2000);
    
    switch (statusnameuser){
        case 'OnHold' :
           element(by.xpath(prospectcreateinputs.NewProspectCreate.StatusName)).click();browser.sleep(2000);
           element(by.xpath(prospectcreateinputs.NewProspectCreate.StatusOnHold)).click();
         break;
       
         case 'InProgress' :
           element(by.xpath(prospectcreateinputs.NewProspectCreate.StatusName)).click();browser.sleep(2000);
           element(by.xpath(prospectcreateinputs.NewProspectCreate.StatusInProgress)).click();  
           break;
    
         case 'Closed':
               element(by.xpath(prospectcreateinputs.NewProspectCreate.StatusName)).click();browser.sleep(2000);
               element(by.xpath(prospectcreateinputs.NewProspectCreate.StatusClosed)).click();  
                break;
                
         default: console.log("Incorrect status added");
  
    }
    browser.sleep(5000);

    for (let p=1;p<=countmember;p++)
    {
    element(by.xpath(prospectcreateinputs.NewProspectCreate.AddTeamMember)).click();browser.sleep(2000);
    

    switch (rolenameuser){
        case 'QA' :
           element(by.xpath(prospectcreateinputs.NewProspectCreate.RoleTeamMember)).click();browser.sleep(2000);
           element(by.xpath(prospectcreateinputs.NewProspectCreate.RoleTeamMemberQA)).click();
         break;
       
        
        default: console.log("Incorrect Role added");}
    }
    browser.sleep(2000);
    
  
    element(by.buttonText(prospectcreateinputs.NewProspectCreate.SaveButton)).click();browser.sleep(2000);
    browser.sleep(2000);  
  
   

};



this.prospect2=function(projectnameuser, statusnameuser,countmember){

    element(by.buttonText(prospectcreateinputs.NewProspectCreate.AddProspectButton)).click();browser.sleep(2000);
    element(by.name(prospectcreateinputs.NewProspectCreate.ProjectName)).sendKeys (projectnameuser);browser.sleep(2000);
    // var filename_Locator = `//h2[@class='filename' and contains(text(),'${filename}')]`;
    switch (statusnameuser){
        case 'OnHold' :
           element(by.xpath(prospectcreateinputs.NewProspectCreate.StatusName)).click();browser.sleep(2000);
           element(by.xpath(prospectcreateinputs.NewProspectCreate.StatusOnHold)).click();
         break;
       
         case 'InProgress' :
           element(by.xpath(prospectcreateinputs.NewProspectCreate.StatusName)).click();browser.sleep(2000);
           element(by.xpath(prospectcreateinputs.NewProspectCreate.StatusInProgress)).click();  
           break;
    
         case 'Closed':
               element(by.xpath(prospectcreateinputs.NewProspectCreate.StatusName)).click();browser.sleep(2000);
               element(by.xpath(prospectcreateinputs.NewProspectCreate.StatusClosed)).click();  
                break;
                
         default: console.log("Incorrect status added");
  
    }
    browser.sleep(1000);

    var Rolesdefine = ["Backend Developer", "Designer","FrontEnd Developer", "Lead","HTML Developer","Full Stack Developer","Mobile Developer", "QA", "PM", "Engg manager"  ];

    for (let i=1;i<=countmember;i++)
    {
      
        browser.actions().mouseMove(element(by.xpath(prospectcreateinputs.NewProspectCreate.AddTeamMember))).perform();
        browser.manage().timeouts().implicitlyWait(5000);
        element(by.xpath(prospectcreateinputs.NewProspectCreate.AddTeamMember)).click();browser.sleep(2000);
        // rolenameuser=Rolesdefine[8];
        P=Math.floor(Math.random()*10); console.log(Rolesdefine[P]);rolenameuser = Rolesdefine[P];
        
        console.log(Rolesdefine);
        switch (rolenameuser){
            case 'QA' :
            element(by.xpath("/html/body/app-root/block-ui/app-home/div/div[1]/div[2]/app-at-create-edit-prospect/div/div[2]/div[2]/div["+ (i+1) +"]/div[2]/div[1]/div/p-dropdown/div/label")).click();browser.sleep(2000);
            // element(by.xpath(prospectcreateinputs.NewProspectCreate.RoleTeamMember)).click();browser.sleep(2000);
            element(by.xpath(prospectcreateinputs.NewProspectCreate.RoleTeamMemberQA)).click();
            break;

            case 'PM' :
            element(by.xpath("/html/body/app-root/block-ui/app-home/div/div[1]/div[2]/app-at-create-edit-prospect/div/div[2]/div[2]/div["+ (i+1) +"]/div[2]/div[1]/div/p-dropdown/div/label")).click();browser.sleep(2000);
            // element(by.xpath(prospectcreateinputs.NewProspectCreate.RoleTeamMember)).click();browser.sleep(2000);
            element(by.xpath(prospectcreateinputs.NewProspectCreate.RoleTeamMemberPM)).click();
            break;

            case 'Engg manager' :
            element(by.xpath("/html/body/app-root/block-ui/app-home/div/div[1]/div[2]/app-at-create-edit-prospect/div/div[2]/div[2]/div["+ (i+1) +"]/div[2]/div[1]/div/p-dropdown/div/label")).click();browser.sleep(2000);
            // element(by.xpath(prospectcreateinputs.NewProspectCreate.RoleTeamMember)).click();browser.sleep(2000);
            element(by.xpath(prospectcreateinputs.NewProspectCreate.RoleTeamMemberEngManager)).click();
            break;

            case 'Backend Developer' :
              element(by.xpath("/html/body/app-root/block-ui/app-home/div/div[1]/div[2]/app-at-create-edit-prospect/div/div[2]/div[2]/div["+ (i+1) +"]/div[2]/div[1]/div/p-dropdown/div/label")).click();browser.sleep(2000);
              // element(by.xpath(prospectcreateinputs.NewProspectCreate.RoleTeamMember)).click();browser.sleep(2000);
              element(by.xpath(prospectcreateinputs.NewProspectCreate.RoleTeamMemberBackendDeveloper)).click();
              break;

            case 'Designer' :
              element(by.xpath("/html/body/app-root/block-ui/app-home/div/div[1]/div[2]/app-at-create-edit-prospect/div/div[2]/div[2]/div["+ (i+1) +"]/div[2]/div[1]/div/p-dropdown/div/label")).click();browser.sleep(2000);
              // element(by.xpath(prospectcreateinputs.NewProspectCreate.RoleTeamMember)).click();browser.sleep(2000);
              element(by.xpath(prospectcreateinputs.NewProspectCreate.RoleTeamMemberDesigner)).click();
            break;

            case 'FrontEnd Developer' :
              element(by.xpath("/html/body/app-root/block-ui/app-home/div/div[1]/div[2]/app-at-create-edit-prospect/div/div[2]/div[2]/div["+ (i+1) +"]/div[2]/div[1]/div/p-dropdown/div/label")).click();browser.sleep(2000);
              // element(by.xpath(prospectcreateinputs.NewProspectCreate.RoleTeamMember)).click();browser.sleep(2000);
              element(by.xpath(prospectcreateinputs.NewProspectCreate.RoleTeamMemberFrontendDeveloper)).click();
            break;

            case 'Lead' :
              element(by.xpath("/html/body/app-root/block-ui/app-home/div/div[1]/div[2]/app-at-create-edit-prospect/div/div[2]/div[2]/div["+ (i+1) +"]/div[2]/div[1]/div/p-dropdown/div/label")).click();browser.sleep(2000);
              // element(by.xpath(prospectcreateinputs.NewProspectCreate.RoleTeamMember)).click();browser.sleep(2000);
              element(by.xpath(prospectcreateinputs.NewProspectCreate.RoleTeamMemberLead)).click();
            break;

            case 'Mobile Developer' :
            element(by.xpath("/html/body/app-root/block-ui/app-home/div/div[1]/div[2]/app-at-create-edit-prospect/div/div[2]/div[2]/div["+ (i+1) +"]/div[2]/div[1]/div/p-dropdown/div/label")).click();browser.sleep(2000);
             // element(by.xpath(prospectcreateinputs.NewProspectCreate.RoleTeamMember)).click();browser.sleep(2000);
                    element(by.xpath(prospectcreateinputs.NewProspectCreate.RoleTeamMemberMobile)).click();
                    break;
                  
            case 'HTML Developer' :
               element(by.xpath("/html/body/app-root/block-ui/app-home/div/div[1]/div[2]/app-at-create-edit-prospect/div/div[2]/div[2]/div["+ (i+1) +"]/div[2]/div[1]/div/p-dropdown/div/label")).click();browser.sleep(2000);
               // element(by.xpath(prospectcreateinputs.NewProspectCreate.RoleTeamMember)).click();browser.sleep(2000);
                element(by.xpath(prospectcreateinputs.NewProspectCreate.RoleTeamMemberHTMLDeveloper)).click();
             break;
            

              case 'Full Stack Developer' :
                 element(by.xpath("/html/body/app-root/block-ui/app-home/div/div[1]/div[2]/app-at-create-edit-prospect/div/div[2]/div[2]/div["+ (i+1) +"]/div[2]/div[1]/div/p-dropdown/div/label")).click();browser.sleep(2000);
                 // element(by.xpath(prospectcreateinputs.NewProspectCreate.RoleTeamMember)).click();browser.sleep(2000);
                 element(by.xpath(prospectcreateinputs.NewProspectCreate.RoleTeamMemberFullStackDeveloper)).click();
                  break;
            
                        
        default: console.log("Incorrect Role added");}
    }
  
    
    element(by.buttonText(prospectcreateinputs.NewProspectCreate.SaveButton)).click();browser.sleep(2000);
    // browser.sleep(2000);

    // browser.navigate().back();

    browser.sleep(5000);
    
   

};


// this.prospect3=function(){
// console.log (prospectbyexcel);

//   element(by.buttonText(prospectcreateinputs.NewProspectCreate.AddProspectButton)).click();browser.sleep(2000);
//   element(by.name(prospectcreateinputs.NewProspectCreate.ProjectName)).sendKeys (prospectbyexcel);browser.sleep(2000);
  
//   switch (statusnameuser){
//       case 'OnHold' :
//          element(by.xpath(prospectcreateinputs.NewProspectCreate.StatusName)).click();browser.sleep(2000);
//          element(by.xpath(prospectcreateinputs.NewProspectCreate.StatusOnHold)).click();
//        break;
     
//        case 'InProgress' :
//          element(by.xpath(prospectcreateinputs.NewProspectCreate.StatusName)).click();browser.sleep(2000);
//          element(by.xpath(prospectcreateinputs.NewProspectCreate.StatusInProgress)).click();  
//          break;
  
//        case 'Closed':
//              element(by.xpath(prospectcreateinputs.NewProspectCreate.StatusName)).click();browser.sleep(2000);
//              element(by.xpath(prospectcreateinputs.NewProspectCreate.StatusClosed)).click();  
//               break;
              
//        default: console.log("Incorrect status added");

//   }

// element(by.buttonText(prospectcreateinputs.NewProspectCreate.SaveButton)).click();browser.sleep(2000);
//   browser.sleep(2000);  

// };





 };
 module.exports=new createprospects();