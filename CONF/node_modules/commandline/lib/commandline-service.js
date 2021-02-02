"use strict";

;(function() {

	var Commandline = require("./commandline").Commandline;
	var _ = require("underscore");

	module.exports = {
		commandline: null,

		// Will be called by the service layer when service get started.
		activate: function(config) {
			var cmd = new Commandline();
			cmd.start();
			this.commandline = cmd;
		},

		// Add new command.
		addCommand: function(cmd) {
			this.commandline.addCmd(cmd);
		},

		// Remove command.
		removeCommand: function(cmd) {
			this.commandline.removeCmd(cmd);
		},

		// Add a list of commands. 
		// The method is also exposed as extension point.
		//
		// @param cl Must be a object which provides the method: "getCommandList".
		addCommandList: function(cl) {
			var list = cl.getCommandList();
			for(var idx in list) {
				this.commandline.addCmd(list[idx]);
			}
		},

		// Remove all commands which will be returned by "getCommandList".
		// This method is also used by the service layer.
		//
		// @param cl Must be a object which provides the method: "getCommandList".
		removeCommandList: function(cl) {
			var list = cl.getCommandList();
			for(var idx in list) {
				this.commandline.removeCmd(list[idx]);
			}
		}
	};	

})();