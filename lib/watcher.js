require('./utils.js');

var spawn = require('child_process').spawn,
	carrier = require('carrier'),
	fs = require('fs');

var COMMAND_NOT_FOUND = 127,
	NORMAL_EXIT = 0;

function getProcess(path, events, recursive) {

	events = events || [];
	events = (events instanceof Array) ? events : [events];

	var flags = ['m','q'];
	if(recursive) { flags.push('r'); }

	var args = []
		.concat(flags.map(function(flag) { return '-' + flag; }))
		.concat(['--format','"%e %w%f"'])
		// .concat(['--exclude',"'\\/\\.'"])
		.concat(events.map(function(eventKey) { return "-e" + eventKey.toLowerCase(); }))
		.concat([path]);

	console.log(args.join(' '));

	return spawn('inotifywait', args);
}

function Watcher(folder, recursive, eventSignature) {
	this.folder = folder;
	this.inotify = undefined;
	this.cachedChanges = {};
	this.recursive = recursive;
	this.eventSignature = eventSignature;

	try {
		fs.statSync(folder);
	} catch(e) {
		throw new Error(folder + ' is not a valid path to be watching.');
	}

	this.changeHandler = function() {};
}

Watcher.prototype = {
	getEvents : function() {
		var eventSignature = this.eventSignature,
			events = Watcher.events;

		if(!eventSignature) {
			eventSignature = events.MOVE | events.CREATE | events.DELETE | events.MODIFY;
		}
		return Object.keys(events).filter(function(eventKey) {
			return (events[eventKey] & eventSignature) == events[eventKey];
		});
	},
	watch : function(func, frequency) {

		if(func) {
			this.onchange(func, frequency);
		}

		var self = this;

		this.stop();
		this.inotify = getProcess(this.folder, this.getEvents(), this.recursive);

		var c = carrier.carry(this.inotify.stdout);
			c.on('line', function(line) {


				var firstSpacePos = line.indexOf(' '),
					events = line.substr(0,firstSpacePos).split(','),
					path = line.substr(firstSpacePos+1);

				if(path.match(/(?:^|\/)\./)) { return; }

				self.cachedChanges[path] = true;
				self.changeHandler();
			});

		this.inotify.stderr.on('data', function(data) { console.log('inotifywait error: ' + data); });
		this.inotify.on('exit', function(code) {

			console.log('inotifywait exited', code);

			self.inotify = undefined;
			var errors = {};
				errors[COMMAND_NOT_FOUND] = 'The program "inotifywait" is not installed. Please install before continuing.';

			if(parseInt(code,0) && (code in errors)) {
				throw new Error(errors[code]);
			}
		});
	},
	stop : function() {
		this.inotify && this.inotify.kill();
		this.inotify = undefined;
	},
	onchange : function(func, frequency) {

		var self = this;
		var dump = function() {
			func(Object.keys(self.cachedChanges));
			self.cachedChanges = {};
		};

		this.changeHandler = frequency ? dump.delay(frequency) : dump;
	}
};

Watcher.events = {};
[
	'ACCESS',
	'MODIFY',
	'ATTRIB',
	'CLOSE_WRITE',
	'CLOSE_NOWRITE',
	'CLOSE',
	'OPEN',
	'MOVED_TO',
	'MOVED_FROM',
	'MOVE',
	'MOVE_SELF',
	'CREATE',
	'DELETE',
	'DELETE_SELF',
	'UNMOUNT'
].forEach(function(eventName, idx) {
	Watcher.events[eventName] = 1 << idx;
});

module.exports = Watcher;