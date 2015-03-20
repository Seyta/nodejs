var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var fs = require('fs');
var ent = require('ent');


app.use(express.static(__dirname + '/css'));

var user_lists = [];

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
})
.use(express.static(__dirname + '/css'));


io.sockets.on('connection', function (socket, pseudo) {

    socket.emit('user_list', user_lists);

    // Dès qu'on nous donne un pseudo, on le stocke en variable de session
    socket.on('petit_nouveau', function(pseudo) {

        socket.pseudo = ent.decode(pseudo);
        user_lists.push(pseudo);
        socket.broadcast.emit('petit_nouveau', socket.pseudo);
    });

    // Dès qu'on reçoit un "message" (clic sur le bouton), on le note dans la console
    socket.on('chat_server', function (message) {

        var message = ent.decode(message);
        socket.broadcast.emit('chat_to_client', {pseudo: socket.pseudo, message: message});
        socket.emit('chat_to_client', {pseudo: socket.pseudo, message: message});
    });

    socket.on('user_leaving', function() {

        var index = user_lists.indexOf(socket.pseudo);
        user_lists.splice(index, 1);
        socket.broadcast.emit('user_remove', socket.pseudo);
    })
});


server.listen(8080);