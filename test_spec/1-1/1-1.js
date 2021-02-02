var clicksubmenuitem= require('../../pages/ClickSubmenuitem.js');
let login_in=require ('../../pages/login.js');


describe ("Preparing for Demo", function () {

    
    beforeAll(function(){
                browser.get('http://qa.zeppl.in/'); 
                // browser.get('http://dev.zeppl.in/'); 
                browser.manage().window().maximize();
                login_in.loginasSaurabh();
                browser.sleep(5000);

                clicksubmenuitem.clicksubmenu();browser.sleep(2000); browser.refresh();
                browser.sleep(2000);

        })

});