const { signup, signin } = require('./auth.service');

const registerUser = async (req, res) => {
  try {
    const user = await signup(req.body);
    res.status(201).json({ message: 'User created successfully', user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { user, token } = await signin(req.body);
    res.json({ user, token });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
};

module.exports = { registerUser, loginUser };
