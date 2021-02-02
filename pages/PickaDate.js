

var PickaDate = function (){

     this.PickaDate=function() {
        
        element(by.xpath("//select [contains(@class,'ui-datepicker-month')]")).sendKeys('December');
        element(by.xpath("//select [contains(@class,'ui-datepicker-year')]")).sendKeys('2020');
        element(by.xpath("//a [text()='15']")).click();
        browser.sleep(2000);
};

this.PickaDate1=function(AllocationTilltDates) {
    // Dec 15, 2020
    // var datepicked= "Jul 21, 2018";
    var datepicked =AllocationTilltDates;
    var Date1 = datepicked.split(',');
    var years = Date1[1];var year = years.slice(1,5);
    var monthsdatee = Date1[0]; var month = monthsdatee.slice(0,3); var dates = monthsdatee.slice(4,6);
    console.log(Date1[0]);
    console.log(Date1[1]);
    console.log(years); console.log('year is '+year); 
    console.log(monthsdatee);console.log('month is '+month);console.log('date is '+dates);
   

   
        element(by.xpath("//select [contains(@class,'ui-datepicker-year')]")).click();browser.sleep(2000);
        element(by.xpath("//option [text()="+year+"]")).click();
       

    element(by.xpath("//select [contains(@class,'ui-datepicker-month')]")).click(); browser.sleep(2000);
    switch (month){
        case 'Jul': element(by.xpath("//option [text()='July']")).click();
        case 'Jan': element(by.xpath("//option [text()='January']")).click();
        case 'Dec': element(by.xpath("//option [text()='December']")).click();
        }
        browser.sleep(2000);
    element(by.xpath("//a [text()="+dates+"]")).click();//improve
    browser.sleep(2000);
};

};



module.exports=new PickaDate();