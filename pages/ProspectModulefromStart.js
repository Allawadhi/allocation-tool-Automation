

var Prospectobjects1 = require ('../pages/LocatorsDirectory.json');
var Prospectobjects = require ('../pages/ProspectTab/LocatorsProspect.json');
// var login_in=require ('../pages/login.js');
var login_in1=require ('../pages/loginPseudo.js');
var clicksubmenuitem= require('../pages/ClickSubmenuitem.js');
var prospectnew = require('../pages/CreateProspect.js');

var ProspectModulefromStart = function (){

     this.ProspectModulefromStart=function(){
     browser.waitForAngularEnabled(false);
     browser.get(Prospectobjects1.testsiteurl); 
     
     browser.manage().window().maximize();
     login_in1.loginasPseudoquant();
     browser.sleep(2000);
     browser.getTitle().then(function(titles){expect(titles).toBe("Zepplin"); });
     clicksubmenuitem.clicksubmenu();browser.sleep(2000); browser.refresh();
     browser.sleep(2000);
};};



module.exports=new ProspectModulefromStart();