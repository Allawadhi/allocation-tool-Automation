var ScreenResolution = function (){

    this.ScreenResolution=function(width, height){
       
        browser.manage().window().setSize(width, height);browser.sleep(3000);
       
 
 };

 this.ScreenResolutionPage=function(){

 for (var i = 0; i < 4; i++) {
            switch (i) {
                case 0:
                    //set resolution 1
                    browser.manage().window().setSize(1080, 480);browser.sleep(3000);
                    element(by.xpath("//div [@class='data-filters-container']")).getAttribute('style').getCssValue('width').then(function(expand){console.log(expand);}) ;
                    break;
                case 1:
                    //set resolution 2
                    browser.manage().window().setSize(1280, 800);browser.sleep(3000);
                    element(by.xpath("//div [@class='data-filters-container']")).getAttribute('style').getCssValue('width').then(function(expand){console.log(expand);}) ;
                    break;
                case 2:
                    //set resolution 3
                    browser.manage().window().setSize(1480, 1024);browser.sleep(3000);
                    element(by.xpath("//div [@class='data-filters-container']")).getAttribute('style').getCssValue('width').then(function(expand){console.log(expand);}) ;
                    break;
                case 3:
                    //set resolution 4
                    browser.manage().window().setSize(1680, 1920);browser.sleep(3000);
                    element(by.xpath("//div [@class='data-filters-container']")).getAttribute('style').getCssValue('width').then(function(expand){console.log(expand);}) ;
                    break;
                default: console.log('I am a Quant');
                    return;
            }
        }


 }

 };
 module.exports=new ScreenResolution();
 
 