const io = require('socket.io')(3000);

const users = {}

io.on('connection', socket => {
  socket.emit('get-connected-users', users);
  console.log('New User Connected')
  socket.on('new-user', (name, publicKey) => { 
    if (users[name] === undefined) {
      users[name] = [socket.id, publicKey]
    } 
    socket.broadcast.emit('user-connected', name)
  })

  socket.on('new-user', name => {
    socket.broadcast.emit('get-connected-users', users)
  })
  socket.on('send-chat-message', (from ,message) => {
    socket.broadcast.emit('chat-message', { message: message, name: from})
  })
   
  socket.on('send-private-message', (from , content, to ) => {
    // console.log('Message from : ', from , 'Message Content is : ' ,content,' user to which this will be send is : ', to)
    const user = users[to][0]
    console.log('The user is : ', user)
    socket.to(user).emit('private-message', {
      content,
      from: from,
    })
  })
})