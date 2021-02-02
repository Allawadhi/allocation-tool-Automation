var URL = function (){

   this.URL=function(){
      browser.getCurrentUrl().then(function(url){console.log('The URL of the page is--> '+url);})

};
};
module.exports=new URL();

