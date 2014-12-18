/*---------------------------------------*
 * NodeJS: Persisting Data
 *---------------------------------------*/
/* Persisting Stores: (All non-blocking!)
	MongoDB
	CouchDB
	PostgreSQL
	Memcached
	Riak
	**Redis** (is a key value store)

	---
	Redis Data Structure
		- Strings
		- Hashes
		- Lists
		- Sets (Are lists of unique data)
		- Sorted Sets
*/

var express  = require('express'),
	expressSession = require('express-session'),
	socket   = require('socket.io'),
	http     = require('http'),
	url      = require('url'),
	redis    = require('redis')
	passport = require('passport'),
	passportLocal = require('passport-local'),
	bodyParser = require('body-parser'),
	cookieParser = require('cookie-parser');

var app     = express();
	server  = http.createServer(app),
	// io      = socket.listen(server);
	/*----- log: false disables the debug messages in the console ------*/
	io      = socket.listen(server, { log: true });

	// Reduce log messages
	io.set('log level', 1)


/*---------------------------------------*
 * Views Engine
 *---------------------------------------*/
app.set('view options', { layout: false })
app.set('view engine', 'ejs')
app.set('views', __dirname + '/app/views')
app.use(express.favicon())


/*---------------------------------------*
 * Auth Engine
 *---------------------------------------*/
app.use(bodyParser({ extended: false }));
app.use(cookieParser());
app.use(expressSession({
	secret: process.env.SECRET_KEY || 'qwerty',
	resave: false,
	saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new passportLocal.Strategy(function(username, password, done){
	if (password === username) {
		done(null, {id: 1, username: "admin", email: "clervens.volcy@gmail.com"});
	} else {
		done(null, null);
	}
}));
passport.serializeUser(function(user, done){
	done(null, user.id);
});
passport.deserializeUser(function(id, done){
	done(null, {id: 1, username: "admin", email: "clervens.volcy@gmail.com"});
});

/*---------------------------------------*
 * Public Files
 *---------------------------------------*/
 // src="/css/style.css"
app.use( express.static(__dirname + '/public'))

// src="/public/css/style.css"
// app.use("/public", express.static(__dirname + '/public'));


/*---------------------------------------*
 * Redis: Init
 *---------------------------------------*/
// redisClient = redis.createClient(4000);
if (process.env.REDISCLOUD_URL) {
	var rcloud  = url.parse(process.env.REDISCLOUD_URL);
	redisClient = redis.createClient(rcloud.port, rcloud.hostname);

	redisClient.auth(rcloud.auth.split(":")[1]);
} else {
	redisClient = redis.createClient();
}

redisClient.on('error', function(err) {
	console.log('Redis:', err);
});
redisClient.del('chatters');
redisClient.del('history');


/*---------------------------------------*
 * Storing Messages Using Redis Client
 *---------------------------------------*/
var saveMessage = function(messageObject) {

	//The obj must be converted into string to store it in redis
	var message = JSON.stringify(messageObject);
	redisClient.lpush('history', message, function(err, response) {
		// keeps the newest 10 messages
		redisClient.ltrim('history', 0, 10);
	});
}

/*---------------------------------------*
 * SocketIO Events
 *---------------------------------------*/
io.sockets.on('connection', function(client) {
	console.log('Client connected...');

	client.on('join', function(name) {

		// Sets the user nickname after Join
		client.set('nickname', name)

		// Notify other clients a person joined
		client.broadcast.emit('add chatter', name)

		// Emit all the currently logged in chatters to the newly connected client
		redisClient.smembers('chatters', function(err, names) {
			names.forEach(function(name) {
				client.emit('add chatter', name)
			})
		});

		// Add user.name To Redis: Chatters Set
		redisClient.sadd('chatters', name);

		// Load Redis Messages (-1 means all the data stored)
		redisClient.lrange('history', 0, -1, function(err, messages) {
			// Reverse so they are emitted in correct order
			messages = messages.reverse();
			messages.forEach(function(oldMsg) {
				// Parse into JSON object
				oldMsg = JSON.parse(oldMsg);
				client.emit('messages', oldMsg)
			})
		});

		client.broadcast.emit('messages', { name: name, text: 'JOINED', time: Date.now()});
		console.log('- ' + name + ' joined.');
	})

	client.on('messages', function(data) {
		//Get the nickname of this client before broadcasting the message
		client.get('nickname', function(err, name) {
			var message = { name: name, text: data, time: Date.now()};

			// When client sends a message call saveMessage
			saveMessage(message);

			// Broadcast with the name and message
			client.broadcast.emit('messages', message)

			console.log(message);
		})
	})

	client.on('disconnect', function(name) {

		// Grab  the name of the person just leave
		client.get('nickname', function(err, name) {

			// Emit that a person left the chat
			client.broadcast.emit('remove chatter', name);
			client.broadcast.emit('messages', { name: name, text: "LEFT THE CHAT", time: Date.now()});

			// Remove the nickname from Redis Chatters Set
			redisClient.srem('chatters', name);
		})
	})
});


/*---------------------------------------*
 * Routes
 *---------------------------------------*/
app.get('/', function(req, res) {
	/*-----Render View------*/
	res.render('index', {
		title: "CVolcy: IRC",
		isAuthenticated: req.isAuthenticated(),
		user: req.user
	})
});
app.post('/login', passport.authenticate('local'), function(req, res){
	res.json({
		isAuthenticated: req.isAuthenticated(),
		username: req.user.username
	});
});

server.listen(process.env.PORT || 3000);
console.log('Listening on port '+(process.env.PORT || 3000)+'...');


