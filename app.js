const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const messageRoutes = require('./routes/messageRoutes');
const { protect } = require('./middleware/authMiddleware');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Message = require('./models/Message');
const dotenv = require('dotenv');

dotenv.config();

connectDB();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);

io.use(async (socket, next) => {
    try {
        const token = socket.handshake.query.token;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = await User.findById(decoded.id).select('-password');
        next();
    } catch (error) {
        next(new Error('Authentication error'));
    }
});

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.username}`);

    socket.on('sendMessage', async ({ receiverUsername, content }) => {
        const receiver = await User.findOne({ username: receiverUsername });
        if (!receiver) {
            return;
        }

        const message = new Message({
            sender: socket.user._id,
            receiver: receiver._id,
            content,
        });

        await message.save();

        io.to(receiver._id.toString()).emit('receiveMessage', {
            sender: socket.user.username,
            content,
        });
    });

    socket.join(socket.user._id.toString());

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.user.username}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
