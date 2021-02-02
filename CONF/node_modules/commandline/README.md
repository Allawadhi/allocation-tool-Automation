
### Commandline

A extendable commandline. The commandline is actually just my first module which uses Services JS declarations to consume commands. Services JS is not a requirement to use the commandline. 

Please also see: 
http://github.com/chilicat/services
http://github.com/chilicat/services-commandline

### How to install

$ npm install commandline

### How to use it
Setup the commandline:

var Commandline = require("./commandline").Commandline;
var cmd = new Commandline();

// Add commands to the command line interface.
// Commandline.Command
cmd.addCmd({
    
    // the command name - e.g. (ls, mkdir, ...)
	name: "sayHello", 

	// What does the command do - howto use it?
	description: "Say Hello to...", 

	execute: function(output, args) {
		output.write("Hello: " + args[0]);
	}

});

cmd.start();

Now you are in a commandline. Enter _help_ to list all available commands. Enter _exit_ to remove to the node.js repl

### Commandline

The Commandline object provides methods to add and remove commands. The Commandline can be activated by calling start.

### Service-Class: commandline-command

The _commandline-command_ must implement:

name: "command name"
description: "command description"
execute: function() {  }


### Service-Class: commandline-commandlist
the _commandline-commandlist_ must implement:

getCommandList: function() {}

The method must return a list of _commandline-command_'s


### License

(The MIT License)

Copyright (c) 2009-2011 dkuffner <dkuffner@chilicat.net>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.