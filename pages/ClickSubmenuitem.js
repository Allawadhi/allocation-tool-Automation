var click_submenu = function (){

   this.clicksubmenu=function(itemname){
    //div [@class='sidenav-hamburger']
element(by.xpath("//div [@class='sidenav-hamburger']")).click();browser.manage().timeouts().implicitlyWait(5000);
// switch (itemname){
// case 'AllocationTool' :
   // element(by.xpath("//span [text()='Allocation Tool']")).click();    
   element(by.xpath("//span [text()='Team']")).click(); 
   browser.sleep('2000');
   element(by.xpath("//span [text()='One on One']")).click(); 
   // break;}


};
};
module.exports=new click_submenu();