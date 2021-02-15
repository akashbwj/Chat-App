const express = require('express');
const app = express();
const path = require('path');
const ejs=require('ejs');
const socketio=require('socket.io');
const formatMessage=require('./utils/messages');
const {userJoin, getCurrentUser,userLeave,getRoomUsers}=require('./utils/users');
const PORT=3000 || process.env.PORT;
const botName='Chat App Bot';

app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine','ejs');

//Routes
app.get('/',(req,res)=>{
    res.render('home');
})

app.get('/chat',(req,res)=>{
    res.render('chat');
})

app.use((req,res)=>{
    res.status(404).send('<h1>Error 404! Page not found</h1>')
})

const server=app.listen(PORT,()=>console.log(`Server listening on port ${PORT}`));

//Socket
const io=socketio(server);
io.on('connection',socket=>{
    socket.on('joinRoom',({username,room})=>{
        const user=userJoin(socket.id,username,room);
        socket.join(user.room);
        //Welcome the current user
        socket.emit('message',formatMessage(botName,'Welcome to Chat App!'));// only to the connecting user

        //Broadcast when a user connects(everyone except the user)
        socket.broadcast.to(user.room).emit('message',formatMessage(botName,`${user.username} has joined the chat`));

        //Send users and room info
        io.to(user.room).emit('roomUsers',{
            room:user.room,
            users:getRoomUsers(user.room)
        });

    })

    //listen for chat msg
    socket.on('chatMessage',msg=>{
        const user=getCurrentUser(socket.id);

        io.to(user.room).emit('message',formatMessage(user.username, msg));
    })

    //Runs when client disconnects
    socket.on('disconnect',()=>{
        const user=userLeave(socket.id);

        if(user){
            io.to(user.room).emit('message',formatMessage(botName, `${user.username} has left the chat`));//to all users in general
            //Send users and room info
            io.to(user.room).emit('roomUsers',{
                room:user.room,
                users:getRoomUsers(user.room)
            });
        }
        
    })


})