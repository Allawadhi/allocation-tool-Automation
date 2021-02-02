"use strict";

(function() {

	var _ = require("underscore");
	var ArgParser = require("argparser");
	var repl = require("repl");

	function outputWrapper(output) {
		return  {
			write: function() {
				output.write.apply(output, arguments);	
			},
					
			close: function() {
				output.write("\n>>");
			}
		}
	};
	
	function addDefaultCommand(cmd, input, output) {
		cmd.addCmd({
			name: "help",	
			description: "Prints this screen",
			execute: function(output) {
				cmd.each(function(cmd) {
					output.write(cmd.name + "  -  " + cmd.description + "\n");
					
				});
				
				output.write("\n");
				output.close();
			}
		});
		
		cmd.addCmd({
			name: "exit",
			description: "Exit commandline",
			execute: function(output) {
				output.write("bye");
				
				input.pause();
				input.removeListener("data", cmd.inputHandler);
				repl.start();
			}
		});
	};

	module.exports = {
		Commandline: function(input, output) {
			var self = this;
			
			var input = input || process.openStdin();
			input.setEncoding('utf8');
			var output = output || process.stdout;
			
			var commands = {};
			
			this.addCmd = function(command) {
				commands[command.name] = command;
			};

			this.removeCmd = function(command) {
				delete commands[command.name];
			};
			
			this.each = function(callback) {
				_.each(commands, callback);
			};
			
			this.getCmd = function(name) {
				return commands[name];
			};
			
			this.findCmd = function(name){
				var command = commands[name];
				
				if(!command) {
					for(var idx in commands) {
						var e = commands[idx];
						if(e.name.match(RegExp("^" + name + ".*"))) {
							return e;
						}
					}
				}
				return command;
			};
			
			this.start = function() {
				input.resume();
				output.write("\nWelcome to chilicats commandline... ");
				output.write("\nType 'help' for more information");
				output.write("\n>>");
	
	 			var buffer = "";
	 			var value = "";

				var inputHandler = function(chunk) {
					
					value += buffer + chunk;
 				   	buffer = '';
    				value = value.replace(/\r/g, '');
    				if (value.indexOf('\n') !== -1) {
      					if (value !== '\n') {
        					value = value.replace(/^\n+/, '');
      					}

				      	buffer = value.substr(value.indexOf('\n'));
				      	value = value.substr(0, value.indexOf('\n'));
				      	value = value.trim();
 						
 						var args = new ArgParser().parse(value.split(" "));
						var cmd = args.getArgs()[0];
		
						var command = self.getCmd(cmd);		
						
						var outWrapper = outputWrapper(output);
						
						if(!command) {
							output.write("\nUnknown command: " + cmd + ".\n");
							self.getCmd("help").execute(outWrapper);
						} else {
							var restArgs = _.rest(args.getArgs(), 1);
							command.execute(outWrapper, restArgs);
						}

						value = ""
					}
				};
				
				this.inputHandler = inputHandler;

				input.on('data', inputHandler);
				input.on("end", function(val, index, array) {
					console.info("END", arguments);
				});
				
				addDefaultCommand(this, input, output);
			};
		}
	}
})();