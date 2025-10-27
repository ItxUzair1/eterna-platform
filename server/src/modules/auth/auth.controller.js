const { signup, signin } = require('./auth.service');

// Register user
const registerUser = async (req, res) => {
  try {
    const user = await signup(req.body);
    res.status(201).json({ message: 'User created successfully', user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Login user
const loginUser = async (req, res) => {
  try {
    // destructure directly from req.body
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Identifier and password are required' });
    }

    const { user, token } = await signin({ identifier, password });
    res.json({ user, token });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
};

module.exports = { registerUser, loginUser };
