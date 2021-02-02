var URL =require('..//pages/URL.js');
var click_windowhandles = function (){

   this.windowhandlesclick=function(itemname){
    let windowHandles = browser.getAllWindowHandles();
    let parentwindow, childwindow;

    windowHandles.then(function (handles)
    {
parentwindow=handles[0];childwindow=handles[1];
browser.switchTo().window(childwindow).then(function(){

   browser.getTitle().then(function(text){console.log('Title of the page is --> '+text);URL.URL();})

}) ;
 browser.close();
browser.sleep(2000);
    
browser.switchTo().window(parentwindow).then(function(){

   browser.getTitle().then(function(text){console.log('Title of the page is --> '+text);URL.URL();})

}) ;
// browser.close();
browser.sleep(2000);
})


};
};
module.exports=new click_windowhandles();