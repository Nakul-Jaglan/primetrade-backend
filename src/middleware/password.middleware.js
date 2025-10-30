const bcrypt = require('bcryptjs');

const hashPassword = async (req, res, next) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        error: 'Password is required'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters long'
      });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    req.body.passwordHash = hashedPassword;
    delete req.body.password;

    next();
  } catch (error) {
    console.error('Password hashing error:', error);
    return res.status(500).json({
      error: 'Error processing password'
    });
  }
};

const verifyPassword = async (plainPassword, hashedPassword) => {
  try {
    const isPasswordValid = await bcrypt.compare(plainPassword, hashedPassword);
    return isPasswordValid;
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
};

module.exports = { hashPassword, verifyPassword };