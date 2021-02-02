//  var Excelupload = require ('xlsx');

var ReadbyExcel = function(){
var Prospestwork= Excelupload.readFile('New_Prospects.xlsx');

var sheetname = Prospestwork.SheetNames[0];
// varsheetname = "prospectdata";
 var address_of_cell ='F2';


var i = 65;var j = 78;

for(k = i; k < j; k++){
    //convert the char code to string (Alphabets)
    var str =String.fromCharCode(k);
    //print the result in console
            // console.log(str);
            for (let p=1;p<3;p++){
                var address_of_cell= str+p;
                // console.log(str+p);

                var name_of_sheet= Prospestwork.Sheets[sheetname];
var desired_cell= name_of_sheet[address_of_cell];
var read_value= desired_cell.v;
console.log(read_value);
return read_value;
            }
}
 

// var name_of_sheet= Prospestwork.Sheets[sheetname];
// var desired_cell= name_of_sheet[address_of_cell];
// var read_value= desired_cell.v;
// console.log(read_value);
// return read_value;



    
}


module.experts=new ReadbyExcel();