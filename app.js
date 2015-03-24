var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var fs = require('fs');
var ent = require('ent');
var mongojs = require('mongojs');


app.use(express.static(__dirname + '/css'));

var user_lists = [];

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
})
.use(express.static(__dirname + '/css'))
.use(express.static(__dirname + '/public/sounds'));


io.sockets.on('connection', function (socket, pseudo) {

    socket.emit('user_list', user_lists);

    // Dès qu'on nous donne un pseudo, on le stocke en variable de session
    socket.on('petit_nouveau', function(pseudo) {

        // envoyer la liste des utilisateurs connectés
        socket.pseudo = ent.decode(pseudo);
        user_lists.push(pseudo);
        socket.broadcast.emit('petit_nouveau', socket.pseudo);

        // envoyer les 10 derniers messages
        var db = mongojs('localhost/chat', ['messages']);
        db.messages.count(function(err, count) {

            (db.messages.find().sort({_id:1}).skip(count-10)).forEach(function(err, docs) {

                if (docs) {
                    socket.emit('chat_to_client', {pseudo: docs.pseudo, message: docs.message, datetime: docs.date});
                }
            })
        })


    });

    // Dès qu'on reçoit un "message" (clic sur le bouton), on le note dans la console
    socket.on('chat_server', function (message) {

        var currentdate = new Date();
        var datetime =  currentdate.getDate() + "/"
            + (currentdate.getMonth()+1)  + "/"
            + currentdate.getFullYear() + " @ "
            + currentdate.getHours() + ":"
            + currentdate.getMinutes() + ":"
            + currentdate.getSeconds();


        // envoyer le message à tout le monde
        var message = ent.decode(message);
        socket.broadcast.emit('chat_to_client', {pseudo: socket.pseudo, message: message, datetime: datetime});
        socket.emit('chat_to_client', {pseudo: socket.pseudo, message: message, datetime: datetime});

        // enregistrer le message dans MongoDB
        var db = mongojs('localhost/chat', ['messages']);
        db.messages.insert({date: datetime, pseudo: socket.pseudo, message: message});
        db.close();
    });

    socket.on('user_image', function(datas) {

        var currentdate = new Date();
        var datetime =  currentdate.getDate() + "/"
            + (currentdate.getMonth()+1)  + "/"
            + currentdate.getFullYear() + " @ "
            + currentdate.getHours() + ":"
            + currentdate.getMinutes() + ":"
            + currentdate.getSeconds();

        socket.broadcast.emit('server_image', {pseudo: socket.pseudo, image: datas, datetime: datetime} );
        socket.emit('server_image', {pseudo: socket.pseudo, image: datas, datetime: datetime});
    })

    socket.on('user_leaving', function() {

        var index = user_lists.indexOf(socket.pseudo);
        user_lists.splice(index, 1);
        socket.broadcast.emit('user_remove', socket.pseudo);
    })
});


server.listen(8080);