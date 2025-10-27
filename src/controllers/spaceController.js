const Space = require('../models/spaceModel');
const Session = require('../models/sessionModel');
const path = require('path');
const fs = require('fs');
const mammoth = require('mammoth');
const marked = require('marked');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');


exports.createSpace = async (req, res) => {
  try {
    const { name, description, taskType } = req.body;

    if (!name || !description || !req.files || req.files.length === 0 || !taskType) {
      return res.status(400).json({
        success: false,
        message: 'Name, description, and at least one file are required.'
      });
    }
    const filePaths = req.files.map((file)=>{
      return `SeerAI/${req.session.uniqueId}/${file.filename}`
    });

    const newSpace = new Space({
      studentId: req.session.uniqueId,
      name,
      description,
      taskType,
      filepaths: filePaths,  
      status: 'ready'        
    });

    await newSpace.save();

    await Session.findOneAndUpdate(
      { uniqueId: req.session.uniqueId },
      { $push: { spaces: newSpace._id } }
    );

    res.status(201).json({
      success: true,
      spaceId: newSpace._id,
      message: 'Interview space created successfully'
    });

  } catch (error) {
    console.error('Error creating space:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating space. Please try again.'
    });
  }
};

exports.uploadFilesToSpace = async (req, res) => {
  try {
    const { spaceId } = req.params;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }
    const space = await Space.findById(spaceId);

    if (!space) {
      return res.status(404).json({
        success: false,
        message: 'Space not found'
      });
    }

    if (space.status === 'processing') {
      return res.status(400).json({
        success: false,
        message: 'Files cannot be uploaded. Space is already processing.'
      });
    }
    const newFilePaths = req.files.map((file)=>{
      return `SeerAI/${req.session.uniqueId}/${file.name}`
    });

    space.filepaths.push(...newFilePaths);
    space.status = 'ready';

    await space.save();

    res.status(200).json({
      success: true,
      message: 'Files uploaded successfully',
      space
    });

  } catch (error) {
    console.error('Error uploading files to space:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload files. Please try again.'
    });
  }
};


exports.getSpaces = async (req, res) => {
  try {
    const spaces = await Space.find({ studentId: req.session.uniqueId });
    
    res.status(200).json({
      success: true,
      spaces
    });
  } catch (error) {
    console.error('Error fetching spaces:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching spaces. Please try again.'
    });
  }
};

exports.getSpaceDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Fetch the space
    const space = await Space.findById(id);
    
    if (!space) {
      return res.status(404).json({
        success: false,
        message: 'Space not found.'
      });
    }
    
    // Verify owner
    if (space.studentId !== req.session.uniqueId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this space.'
      });
    }
    
    // Set up DOMPurify for server-side sanitization
    const window = new JSDOM('').window;
    const DOMPurify = createDOMPurify(window);
    
    // Sanitize and parse markdown for different fields
    if (space.jobDescription && space.jobDescription !== 'N/A') {
      space.jobDescription = DOMPurify.sanitize(marked.parse(space.jobDescription));
    }
    
    if (space.purifiedSummary) {
      space.purifiedSummary = DOMPurify.sanitize(marked.parse(space.purifiedSummary));
    }
    
    // Process interview rounds
    if (space.interviewRounds && space.interviewRounds.length > 0) {
      space.interviewRounds = space.interviewRounds.map(round => {
        // Only process summary if it exists and the round is not 'not completed'
        if (round.summary && round.status !== 'not completed') {
          // Convert summary to HTML and sanitize
          round.summaryHTML = DOMPurify.sanitize(marked.parse(round.summary));
        }
        return round;
      });
    }
    
    res.status(200).json({
      success: true,
      space
    });
  } catch (error) {
    console.error('Error fetching space details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching space details. Please try again.'
    });
  }
};

// Download resume
exports.downloadResume = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the space to get the resume path
    const space = await Space.findById(id);
    
    if (!space) {
      return res.status(404).json({
        success: false,
        message: 'Space not found'
      });
    }
    
    // Verify owner
    if (space.studentId !== req.session.uniqueId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this resume'
      });
    }
    
    const filePath = path.resolve(path.join(__dirname, '../../public/Resumes', space.resumePath));
    
    // Security check to prevent directory traversal
    if (!filePath.startsWith(path.resolve(path.join(__dirname, '../../public/Resumes')))) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Resume file not found'
      });
    }
    
    res.download(filePath, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        return res.status(500).json({
          success: false,
          message: 'Error downloading file'
        });
      }
    });
  } catch (error) {
    console.error('Error in download route:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing download request'
    });
  }
};