const Session = require('../models/sessionModel');
const crypto = require('crypto');


exports.createSession = async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }
    const uniqueId = crypto.randomBytes(4).toString('hex');

    const session = await Session.create({
      uniqueId,
      name,
      spaces: []
    });
    req.session.uniqueId = uniqueId;
    req.session.name = name;

    res.status(201).json({
      success: true,
      uniqueId,
      name,
      message: 'Session created successfully'
    });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating session. Please try again.'
    });
  }
};


exports.findSession = async (req, res) => {
  try {
    const { uniqueId } = req.body;
    
    if (!uniqueId || uniqueId.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }

    const session = await Session.findOne({ uniqueId });
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found. Please check your ID.'
      });
    }

    session.lastActive = Date.now();
    await session.save();
    
    req.session.uniqueId = uniqueId;
    req.session.name = session.name;

    res.status(200).json({
      success: true,
      name: session.name,
      message: 'Session found successfully'
    });
  } catch (error) {
    console.error('Error finding session:', error);
    res.status(500).json({
      success: false,
      message: 'Error accessing session. Please try again.'
    });
  }
};


exports.getProfile = async (req, res) => {
  try {
    const session = await Session.findOne({ uniqueId: req.session.uniqueId });
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    res.status(200).json({
      success: true,
      user: {
        name: session.name,
      },
      sessionId: session.uniqueId
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile'
    });
  }
};


exports.updateProfile = async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }
    
    const session = await Session.findOneAndUpdate(
      { uniqueId: req.session.uniqueId },
      { name },
      { new: true }
    );
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    req.session.name = name;
    
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};


exports.endSession = (req, res) => {
  req.session = null;
  res.status(200).json({
    success: true,
    message: 'Session ended successfully'
  });
};