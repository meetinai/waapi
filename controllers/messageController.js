const Message = require('../models/Message');
const User = require('../models/User');

const sendMessage = async (req, res) => {
    const { receiverUsername, content } = req.body;
    const senderId = req.user.id;

    try {
        const receiver = await User.findOne({ username: receiverUsername });

        if (!receiver) {
            return res.status(400).json({ error: 'User not found' });
        }

        const message = new Message({
            sender: senderId,
            receiver: receiver._id,
            content,
        });

        await message.save();

        res.status(201).json(message);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const getMessages = async (req, res) => {
    const userId = req.user.id;

    try {
        const messages = await Message.find({
            $or: [{ sender: userId }, { receiver: userId }],
        }).populate('sender receiver', 'username');

        res.json(messages);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = { sendMessage, getMessages };
